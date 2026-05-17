import { Transaction, resolveScriptHash } from '@meshsdk/core';
import { systemWallet, signAndSubmit } from './wallet.js';
import { getSystemPolicy } from './policies.js';
import { getClaimAssetName } from './assetNames.js';
import { createClient } from '@supabase/supabase-js';

/**
 * Burns claimed tokens in batches as part of the EOD reconciliation pipeline.
 *
 * Flow:
 *   1. Query claim_stubs where claimed=true AND burned_at IS NULL AND mint_tx_hash IS NOT NULL
 *   2. Group by campaign (disaster_code + aid_type + agency) so each batch shares one asset name
 *   3. For each group, build a burn transaction (max BATCH_SIZE per tx)
 *   4. Sign via KMS and submit
 *   5. Update burn_tx_hash + burned_at in the database
 *
 * Usage:
 *   node --env-file=.env lib/blockchain/burnClaimStubs.js
 */

const BATCH_SIZE = 20; // Max tokens per transaction (Cardano tx size limit)

/**
 * Burns a batch of claimed tokens for a single campaign.
 * @param {object} campaign — { disasterCode, aidType, agency }
 * @param {number} quantity — Number of tokens to burn in this batch
 * @returns {Promise<string>} The transaction hash
 */
export async function burnBatch(campaign, quantity) {
  if (quantity <= 0) throw new Error('quantity must be > 0');

  const assetName = getClaimAssetName(campaign);
  await systemWallet.init();
  const { claimForgeScript } = await getSystemPolicy();
  
  const policyId = resolveScriptHash(claimForgeScript);
  const assetNameHex = Buffer.from(assetName, 'utf8').toString('hex');
  const unit = policyId + assetNameHex;

  const tx = new Transaction({ initiator: systemWallet });

  // burnAsset burns tokens from the initiator (systemWallet)
  tx.burnAsset(claimForgeScript, {
    unit: unit,
    quantity: String(quantity),
  });

  const unsignedTx = await tx.build();
  const txHash = await signAndSubmit(unsignedTx, 'system:master');

  return txHash;
}

/**
 * Runs the full EOD burn pipeline.
 * Queries the database for all claimed-but-not-burned stubs,
 * groups them by campaign, and burns in batches.
 */
export async function runBurnPipeline() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch all claimed stubs pending burn
  const { data: pendingStubs, error } = await supabase
    .from('claim_stubs')
    .select('id, disaster_event_id, aid_type, agency, mint_tx_hash')
    .eq('claimed', true)
    .is('burned_at', null)
    .not('mint_tx_hash', 'is', null);

  if (error) {
    console.error('[Burn] Failed to fetch pending stubs:', error);
    return { burned: 0, errors: [error.message] };
  }

  if (!pendingStubs || pendingStubs.length === 0) {
    console.log('[Burn] No claimed stubs pending burn. Nothing to do.');
    return { burned: 0, errors: [] };
  }

  console.log(`[Burn] Found ${pendingStubs.length} claimed stub(s) pending burn.`);

  // 2. We need disaster system_codes for asset naming — fetch them
  const disasterIds = [...new Set(pendingStubs.map(s => s.disaster_event_id))];
  const { data: disasters } = await supabase
    .from('disaster_events')
    .select('id, system_code')
    .in('id', disasterIds);

  const disasterCodeMap = {};
  for (const d of (disasters || [])) {
    disasterCodeMap[d.id] = d.system_code;
  }

  // 3. Group stubs by campaign (disasterCode + aidType + agency)
  const groups = {};
  for (const stub of pendingStubs) {
    const disasterCode = disasterCodeMap[stub.disaster_event_id];
    if (!disasterCode) {
      console.warn(`[Burn] Skipping stub ${stub.id} — disaster code not found for ${stub.disaster_event_id}`);
      continue;
    }
    const key = `${disasterCode}|${stub.aid_type}|${stub.agency}`;
    if (!groups[key]) {
      groups[key] = {
        campaign: { disasterCode, aidType: stub.aid_type, agency: stub.agency },
        stubs: [],
      };
    }
    groups[key].stubs.push(stub);
  }

  // 4. Burn each group in batches
  let totalBurned = 0;
  const errors = [];

  for (const [key, group] of Object.entries(groups)) {
    const { campaign, stubs } = group;

    // Chunk into batches
    for (let i = 0; i < stubs.length; i += BATCH_SIZE) {
      const batch = stubs.slice(i, i + BATCH_SIZE);
      const batchIds = batch.map(s => s.id);

      try {
        console.log(`[Burn] Burning ${batch.length} token(s) for ${key}...`);
        const txHash = await burnBatch(campaign, batch.length);
        console.log(`[Burn] ✅ Burned. TX: ${txHash}`);

        // 5. Update the database
        const now = new Date().toISOString();
        await supabase
          .from('claim_stubs')
          .update({ burn_tx_hash: txHash, burned_at: now })
          .in('id', batchIds);

        totalBurned += batch.length;
      } catch (err) {
        const msg = `Failed to burn batch for ${key}: ${err.message || err}`;
        console.error(`[Burn] ❌ ${msg}`);
        errors.push(msg);
        // Continue to next batch — don't stop the whole pipeline
      }
    }
  }

  console.log(`[Burn] Pipeline complete. Burned: ${totalBurned}, Errors: ${errors.length}`);
  return { burned: totalBurned, errors };
}

// ── CLI entrypoint ────────────────────────────────────────────────────
// If run directly: node --env-file=.env lib/blockchain/burnClaimStubs.js
const isDirectRun = process.argv[1]?.includes('burnClaimStubs');
if (isDirectRun) {
  runBurnPipeline()
    .then(result => {
      console.log('\n── EOD Burn Summary ──');
      console.log(`  Tokens burned: ${result.burned}`);
      if (result.errors.length) {
        console.log(`  Errors: ${result.errors.length}`);
        result.errors.forEach(e => console.log(`    - ${e}`));
      }
      process.exit(result.errors.length > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Burn pipeline crashed:', err);
      process.exit(1);
    });
}
