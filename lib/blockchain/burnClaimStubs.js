import { Transaction, resolveScriptHash, unixTimeToEnclosingSlot } from '@meshsdk/core';
import { systemWallet, signAndSubmit, signAndSubmitMultiSig, getCustodialAddress } from './wallet.js';
import { getCampaignClaimPolicy, slotConfig } from './policies.js';
import { getClaimAssetName } from './assetNames.js';
import { createClient } from '@supabase/supabase-js';

/**
 * Burns claimed tokens in batches as part of the EOD reconciliation pipeline.
 *
 * Flow:
 *   1. Query claim_stubs where claimed=true AND burned_at IS NULL AND mint_tx_hash IS NOT NULL
 *   2. Group by campaign (disaster_code + aid_type + agency) so each batch shares one asset name
 *   3. For each group, build a burn transaction
 *   4. Sign via KMS and submit
 *   5. Update burn_tx_hash + burned_at in the database
 *
 * Usage:
 *   node --env-file=.env lib/blockchain/burnClaimStubs.js
 */

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
  const { claimForgeScript } = await getCampaignClaimPolicy(campaign);
  
  const policyId = resolveScriptHash(claimForgeScript);
  const assetNameHex = Buffer.from(assetName, 'utf8').toString('hex');
  const unit = policyId + assetNameHex;

  const tx = new Transaction({ initiator: systemWallet });

  // Set validity range: Burning must only happen DURING the distribution (plus 1 hour) (skipped in DEMO_MODE)
  if (campaign.startsAt && process.env.DEMO_MODE !== 'true') {
    const startsAtMs = new Date(campaign.startsAt).getTime();
    const startsAtSlot = unixTimeToEnclosingSlot(startsAtMs, slotConfig);
    tx.setTimeToStart(String(startsAtSlot));
  }

  if (campaign.endsAt && process.env.DEMO_MODE !== 'true') {
    const endsAtMs = new Date(campaign.endsAt).getTime();
    const endsAtPlus1HourMs = endsAtMs + (60 * 60 * 1000);
    const endsAtSlot = unixTimeToEnclosingSlot(endsAtPlus1HourMs, slotConfig);
    tx.setTimeToExpire(String(endsAtSlot));
  }

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
 * Burns a single claimed token using a multi-signature transaction
 * requiring signatures from Super Admin, distributing Relief Worker, and Beneficiary.
 *
 * @param {object} campaign — { disasterCode, aidType, agency }
 * @param {object} adminProfile — { wallet_index, wallet_address }
 * @param {object} workerProfile — { wallet_index, wallet_address }
 * @param {object} beneficiaryProfile — { wallet_index, wallet_address }
 * @returns {Promise<string>} The transaction hash
 */
export async function burnIndividualMultiSigStub(campaign, adminProfile, workerProfile, beneficiaryProfile) {
  const assetName = getClaimAssetName(campaign);
  await systemWallet.init();
  const { claimForgeScript } = await getCampaignClaimPolicy(campaign);

  const policyId = resolveScriptHash(claimForgeScript);
  const assetNameHex = Buffer.from(assetName, 'utf8').toString('hex');
  const unit = policyId + assetNameHex;

  // Resolve target addresses for the three signers
  const adminAddress = adminProfile.wallet_address || await getCustodialAddress(adminProfile.wallet_index);
  const workerAddress = workerProfile.wallet_address || await getCustodialAddress(workerProfile.wallet_index);
  const beneficiaryAddress = beneficiaryProfile.wallet_address || await getCustodialAddress(beneficiaryProfile.wallet_index);

  const tx = new Transaction({ initiator: systemWallet });

  // Set validity range: Burning must only happen DURING the distribution (plus 1 hour) (skipped in DEMO_MODE)
  if (campaign.startsAt && process.env.DEMO_MODE !== 'true') {
    const startsAtMs = new Date(campaign.startsAt).getTime();
    const startsAtSlot = unixTimeToEnclosingSlot(startsAtMs, slotConfig);
    tx.setTimeToStart(String(startsAtSlot));
  }

  if (campaign.endsAt && process.env.DEMO_MODE !== 'true') {
    const endsAtMs = new Date(campaign.endsAt).getTime();
    const endsAtPlus1HourMs = endsAtMs + (60 * 60 * 1000);
    const endsAtSlot = unixTimeToEnclosingSlot(endsAtPlus1HourMs, slotConfig);
    tx.setTimeToExpire(String(endsAtSlot));
  }

  // burnAsset burns tokens from the initiator (systemWallet)
  tx.burnAsset(claimForgeScript, {
    unit: unit,
    quantity: '1',
  });

  // Set the three required transaction signers (enforces verification on-chain)
  tx.setRequiredSigners([adminAddress, workerAddress, beneficiaryAddress]);

  const unsignedTx = await tx.build();

  // Map database indices to their corresponding KMS signing indexes
  const getSigningIndex = (profile) => {
    if (!profile || profile.wallet_index === undefined || profile.wallet_index === null) {
      return 'system:master';
    }
    const idx = Number(profile.wallet_index);
    return idx === 0 ? 'system:master' : `wallet:${idx}`;
  };

  const signingIndexes = [
    ...new Set([
      'system:master', // Policy authority - ALWAYS REQUIRED to satisfy the policy script
      getSigningIndex(adminProfile),
      getSigningIndex(workerProfile),
      getSigningIndex(beneficiaryProfile),
    ])
  ];

  // Submit fully-signed multi-sig transaction
  const txHash = await signAndSubmitMultiSig(unsignedTx, signingIndexes);
  return txHash;
}

/**
 * Runs the full EOD burn pipeline.
 * Queries the database for all claimed-but-not-burned stubs,
 * resolves signer identities, and burns each individually with on-chain multi-sig.
 */
export async function runBurnPipeline() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch all claimed stubs pending burn
  const { data: pendingStubs, error } = await supabase
    .from('claim_stubs')
    .select('id, beneficiary_uuid, disaster_event_id, aid_type, agency, approved_by, claimed_by, mint_tx_hash')
    .eq('claimed', true)
    .is('burned_at', null)
    .not('mint_tx_hash', 'is', null);

  if (error) {
    console.error('[Burn] Failed to fetch pending stubs:', error);
    return { burned: 0, errors: [error.message] };
  }

  if (!pendingStubs || pendingStubs.length === 0) {
    return { burned: 0, errors: [] };
  }

  // 2. Fetch disaster system_codes for asset naming
  const disasterIds = [...new Set(pendingStubs.map(s => s.disaster_event_id))];
  const { data: disasters } = await supabase
    .from('disaster_events')
    .select('id, system_code, name, allowed_regions, starts_at, ends_at')
    .in('id', disasterIds);

  const disasterMap = {};
  for (const d of (disasters || [])) {
    disasterMap[d.id] = {
      systemCode: d.system_code,
      disasterName: d.name,
      allowedRegions: d.allowed_regions,
      startsAt: d.starts_at,
      endsAt: d.ends_at
    };
  }

  // 3. Fetch wallet information for beneficiaries
  const beneficiaryUuids = [...new Set(pendingStubs.map(s => s.beneficiary_uuid))];
  const { data: beneficiariesData } = await supabase
    .from('beneficiaries')
    .select('system_uuid, wallet_index, wallet_address')
    .in('system_uuid', beneficiaryUuids);
  const beneficiaryMap = Object.fromEntries((beneficiariesData || []).map(b => [b.system_uuid, b]));

  // 4. Fetch wallet information for staff (Super Admins and Relief Workers)
  const staffIds = [...new Set([
    ...pendingStubs.map(s => s.approved_by),
    ...pendingStubs.map(s => s.claimed_by)
  ].filter(Boolean))];
  const { data: staffData } = await supabase
    .from('staff_profiles')
    .select('id, wallet_index, wallet_address')
    .in('id', staffIds);
  const staffMap = Object.fromEntries((staffData || []).map(s => [s.id, s]));

  // 5. Process each stub individually for multi-sig burning
  let totalBurned = 0;
  const errors = [];

  for (const stub of pendingStubs) {
    const disasterInfo = disasterMap[stub.disaster_event_id];
    if (!disasterInfo) {
      console.warn(`[Burn] Skipping stub ${stub.id} — disaster code not found for ${stub.disaster_event_id}`);
      continue;
    }

    const region = Array.isArray(disasterInfo.allowedRegions) && disasterInfo.allowedRegions.length > 0 ? disasterInfo.allowedRegions[0] : 'Unknown';

    const campaign = {
      disasterCode: disasterInfo.systemCode,
      disasterName: disasterInfo.disasterName,
      allowedRegions: disasterInfo.allowedRegions,
      aidType: stub.aid_type,
      agency: stub.agency,
      region,
      startsAt: disasterInfo.startsAt,
      endsAt: disasterInfo.endsAt,
    };

    const adminProfile = staffMap[stub.approved_by];
    const workerProfile = staffMap[stub.claimed_by];
    const beneficiaryProfile = beneficiaryMap[stub.beneficiary_uuid];

    // Verify all signer profiles exist to form the multi-sig team
    if (!adminProfile || !workerProfile || !beneficiaryProfile) {
      const missing = [];
      if (!adminProfile) missing.push('Admin');
      if (!workerProfile) missing.push('Worker');
      if (!beneficiaryProfile) missing.push('Beneficiary');

      const msg = `Skipping stub ${stub.id} due to missing profiles: ${missing.join(', ')}`;
      console.warn(`[Burn] ⚠️ ${msg}`);
      errors.push(msg);
      continue;
    }

    try {
      const txHash = await burnIndividualMultiSigStub(campaign, adminProfile, workerProfile, beneficiaryProfile);

      // Update the database
      const now = new Date().toISOString();
      await supabase
        .from('claim_stubs')
        .update({ burn_tx_hash: txHash, burned_at: now })
        .eq('id', stub.id);

      totalBurned++;
    } catch (err) {
      const msg = `Failed to burn stub ${stub.id}: ${err.message || err}`;
      console.error(`[Burn] ❌ ${msg}`);
      errors.push(msg);
    }
  }

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
