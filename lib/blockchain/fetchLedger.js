/**
 * BLOCKCHAIN LEDGER FETCHER — Queries the Cardano testnet via Blockfrost
 * to retrieve minted claim stub tokens and their on-chain metadata.
 *
 * This is used by the public transparency portal to show real blockchain data
 * instead of database records.
 */

import { BLOCKFROST_API_KEY, NETWORK } from './constants.js';

const BASE_URL = NETWORK === 'mainnet'
  ? 'https://cardano-mainnet.blockfrost.io/api/v0'
  : 'https://cardano-preprod.blockfrost.io/api/v0';

async function blockfrostFetch(endpoint) {
  if (!BLOCKFROST_API_KEY) {
    throw new Error('BLOCKFROST_API_KEY not configured');
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'project_id': BLOCKFROST_API_KEY },
    next: { revalidate: 30 }, // Cache for 30 seconds
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Blockfrost error ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Fetch all assets minted under a given policy ID.
 * Returns array of { asset, quantity } objects.
 */
export async function fetchPolicyAssets(policyId) {
  if (!policyId) return [];

  try {
    const assets = await blockfrostFetch(`/assets/policy/${policyId}`);
    return assets || [];
  } catch (error) {
    console.error('fetchPolicyAssets error:', error.message);
    return [];
  }
}

/**
 * Fetch detailed info + on-chain metadata for a specific asset.
 */
export async function fetchAssetDetails(assetId) {
  try {
    const details = await blockfrostFetch(`/assets/${assetId}`);
    return details;
  } catch (error) {
    console.error('fetchAssetDetails error:', error.message);
    return null;
  }
}

/**
 * Fetch transaction metadata for a specific transaction hash.
 */
export async function fetchTxMetadata(txHash) {
  try {
    const metadata = await blockfrostFetch(`/txs/${txHash}/metadata`);
    return metadata;
  } catch (error) {
    console.error('fetchTxMetadata error:', error.message);
    return null;
  }
}

/**
 * Fetch transaction details (block time, etc.)
 */
export async function fetchTxDetails(txHash) {
  try {
    const tx = await blockfrostFetch(`/txs/${txHash}`);
    return tx;
  } catch (error) {
    console.error('fetchTxDetails error:', error.message);
    return null;
  }
}

/**
 * Fetch all minted claim tokens and their metadata for the transparency ledger.
 * Returns structured ledger entries from on-chain data.
 */
export async function fetchBlockchainLedger(policyId) {
  if (!BLOCKFROST_API_KEY || !policyId) {
    return { entries: [], metrics: { totalAssets: 0, activePolicyId: policyId || 'N/A' } };
  }

  try {
    // 1. Get all assets under the claim policy
    const assets = await fetchPolicyAssets(policyId);
    if (!assets || assets.length === 0) {
      return { entries: [], metrics: { totalAssets: 0, activePolicyId: policyId } };
    }

    // 2. Fetch details for each asset (with concurrency limit)
    const entries = [];
    for (const asset of assets.slice(0, 50)) { // Limit to 50 most recent
      const details = await fetchAssetDetails(asset.asset);
      if (!details) continue;

      const onchainMeta = details.onchain_metadata || {};
      const mintTxHash = details.initial_mint_tx_hash;

      // Get tx timestamp
      let timestamp = null;
      if (mintTxHash) {
        const txDetails = await fetchTxDetails(mintTxHash);
        if (txDetails) {
          timestamp = new Date(txDetails.block_time * 1000).toISOString();
        }
      }

      // Decode hex asset name to readable string
      let assetNameReadable = details.asset_name || '';
      try {
        assetNameReadable = Buffer.from(assetNameReadable, 'hex').toString('utf8');
      } catch { /* keep hex if decode fails */ }

      entries.push({
        id: asset.asset,
        assetName: assetNameReadable,
        policyId: details.policy_id,
        fingerprint: details.fingerprint,
        quantity: parseInt(details.quantity || asset.quantity || '0'),
        mintTxHash: mintTxHash || 'unknown',
        // On-chain metadata from CIP-25
        disasterCode: onchainMeta.disaster_code || parseDisasterCodeFromName(assetNameReadable),
        aidType: onchainMeta.aid_type || parseAidTypeFromName(assetNameReadable),
        agency: onchainMeta.agency || parseAgencyFromName(assetNameReadable),
        description: onchainMeta.description || '',
        region: onchainMeta.region || '',
        timestamp: timestamp,
      });
    }

    return {
      entries,
      metrics: {
        totalAssets: assets.length,
        activePolicyId: policyId,
      },
    };
  } catch (error) {
    console.error('fetchBlockchainLedger error:', error.message);
    return { entries: [], metrics: { totalAssets: 0, activePolicyId: policyId } };
  }
}

/**
 * Check what claim tokens a specific wallet address holds.
 * Used for the "My Tokens" beneficiary lookup via blockchain.
 */
export async function fetchWalletClaimTokens(walletAddress, policyId) {
  if (!BLOCKFROST_API_KEY || !walletAddress || !policyId) {
    return [];
  }

  try {
    // Fetch all UTxOs for this address filtered by policy
    const utxos = await blockfrostFetch(`/addresses/${walletAddress}/utxos/${policyId}`);
    if (!utxos || utxos.length === 0) return [];

    const tokens = [];
    for (const utxo of utxos) {
      for (const amount of (utxo.amount || [])) {
        if (amount.unit !== 'lovelace' && amount.unit.startsWith(policyId)) {
          const assetHex = amount.unit.slice(policyId.length);
          let assetName = '';
          try { assetName = Buffer.from(assetHex, 'hex').toString('utf8'); } catch {}

          // Fetch asset metadata
          const details = await fetchAssetDetails(amount.unit);
          const onchainMeta = details?.onchain_metadata || {};

          tokens.push({
            unit: amount.unit,
            quantity: amount.quantity,
            assetName,
            disasterCode: onchainMeta.disaster_code || parseDisasterCodeFromName(assetName),
            aidType: onchainMeta.aid_type || parseAidTypeFromName(assetName),
            agency: onchainMeta.agency || parseAgencyFromName(assetName),
            txHash: utxo.tx_hash,
          });
        }
      }
    }

    return tokens;
  } catch (error) {
    console.error('fetchWalletClaimTokens error:', error.message);
    return [];
  }
}

// ============================================================================
// HELPERS — Parse asset name format: AGENCY-AIDTYPE-DISASTERCODE
// ============================================================================

function parseDisasterCodeFromName(name) {
  if (!name) return 'Unknown';
  const parts = name.split('-');
  // Format: AGENCY-AIDTYPE-DISASTERCODE (e.g., DSWD-FOOD-TY2026001)
  if (parts.length >= 3) {
    // Reconstruct disaster code: TY2026001 -> TY-2026-001
    const raw = parts.slice(2).join('-');
    if (raw.length >= 9) {
      return `${raw.slice(0, 2)}-${raw.slice(2, 6)}-${raw.slice(6)}`;
    }
    return raw;
  }
  return 'Unknown';
}

function parseAidTypeFromName(name) {
  if (!name) return 'Unknown';
  const parts = name.split('-');
  if (parts.length >= 2) {
    const code = parts[1];
    const map = { 'FOOD': 'Food Ration', 'MEDI': 'Medical Kit', 'CASH': 'Cash Assistance', 'HYGI': 'Hygiene Kit' };
    return map[code] || code;
  }
  return 'Unknown';
}

function parseAgencyFromName(name) {
  if (!name) return 'Unknown';
  const parts = name.split('-');
  if (parts.length >= 1) return parts[0];
  return 'Unknown';
}
