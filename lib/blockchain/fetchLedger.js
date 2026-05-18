/**
 * BLOCKCHAIN LEDGER FETCHER — Queries the Cardano testnet via Blockfrost
 * to retrieve minted claim stub tokens and their on-chain metadata.
 *
 * This is used by the public transparency portal to show real blockchain data.
 * It does NOT import wallet.js or policies.js — it only needs a policy ID
 * string and the Blockfrost API key, making it safe for Next.js server usage.
 */

const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY || '';

// Detect the correct Blockfrost network from the API key prefix
function getBaseUrl() {
  if (BLOCKFROST_API_KEY.startsWith('mainnet')) {
    return 'https://cardano-mainnet.blockfrost.io/api/v0';
  } else if (BLOCKFROST_API_KEY.startsWith('preview')) {
    return 'https://cardano-preview.blockfrost.io/api/v0';
  } else if (BLOCKFROST_API_KEY.startsWith('preprod')) {
    return 'https://cardano-preprod.blockfrost.io/api/v0';
  }
  // Default to preview
  return 'https://cardano-preview.blockfrost.io/api/v0';
}

/**
 * Get the human-readable network name from the API key
 */
export function getNetworkName() {
  if (BLOCKFROST_API_KEY.startsWith('mainnet')) return 'Mainnet';
  if (BLOCKFROST_API_KEY.startsWith('preview')) return 'Preview';
  if (BLOCKFROST_API_KEY.startsWith('preprod')) return 'Preprod';
  return 'Preview';
}

/**
 * Get the Cardanoscan base URL for the detected network
 */
export function getExplorerBaseUrl() {
  if (BLOCKFROST_API_KEY.startsWith('mainnet')) return 'https://cardanoscan.io';
  if (BLOCKFROST_API_KEY.startsWith('preprod')) return 'https://preprod.cardanoscan.io';
  return 'https://preview.cardanoscan.io';
}

async function blockfrostFetch(endpoint) {
  if (!BLOCKFROST_API_KEY) {
    throw new Error('BLOCKFROST_API_KEY not configured');
  }

  const res = await fetch(`${getBaseUrl()}${endpoint}`, {
    headers: { 'project_id': BLOCKFROST_API_KEY },
    next: { revalidate: 30 },
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
    return await blockfrostFetch(`/assets/${assetId}`);
  } catch (error) {
    console.error('fetchAssetDetails error:', error.message);
    return null;
  }
}

/**
 * Fetch transaction details (block time, etc.)
 */
export async function fetchTxDetails(txHash) {
  try {
    return await blockfrostFetch(`/txs/${txHash}`);
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

    // 2. Fetch details for each asset (limit to 50)
    const entries = [];
    for (const asset of assets.slice(0, 50)) {
      const details = await fetchAssetDetails(asset.asset);
      if (!details) continue;

      // Decode hex asset name
      let assetNameReadable = details.asset_name || '';
      try {
        assetNameReadable = Buffer.from(assetNameReadable, 'hex').toString('utf8');
      } catch { /* keep hex */ }

      // Skip identity tokens — only show claim stubs
      if (assetNameReadable.startsWith('ResQIdentity')) continue;

      const onchainMeta = details.onchain_metadata || {};

      // Also skip if metadata indicates it's an identity NFT
      if (onchainMeta.description === 'ResQ Verified Beneficiary Identity') continue;

      const mintTxHash = details.initial_mint_tx_hash;

      // Get tx timestamp
      let timestamp = null;
      if (mintTxHash) {
        const txDetails = await fetchTxDetails(mintTxHash);
        if (txDetails) {
          timestamp = new Date(txDetails.block_time * 1000).toISOString();
        }
      }

      entries.push({
        id: asset.asset,
        assetName: assetNameReadable,
        policyId: details.policy_id,
        fingerprint: details.fingerprint,
        quantity: parseInt(details.quantity || asset.quantity || '0'),
        mintTxHash: mintTxHash || 'unknown',
        // On-chain CIP-25 metadata
        disasterCode: onchainMeta.disaster_code || 'Unknown',
        aidType: onchainMeta.aid_type || 'Unknown',
        agency: onchainMeta.agency || 'Unknown',
        description: onchainMeta.description || '',
        region: onchainMeta.region || '',
        tokenName: onchainMeta.name || assetNameReadable,
        timestamp,
      });
    }

    // Sort by timestamp descending (latest first)
    entries.sort((a, b) => {
      if (!a.timestamp && !b.timestamp) return 0;
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return {
      entries,
      metrics: {
        totalAssets: entries.length,
        activePolicyId: policyId,
      },
    };
  } catch (error) {
    console.error('fetchBlockchainLedger error:', error.message);
    return { entries: [], metrics: { totalAssets: 0, activePolicyId: policyId } };
  }
}

