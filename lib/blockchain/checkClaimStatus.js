import { provider } from './wallet.js';
import { claimPolicyId } from './policies.js';
import { getClaimAssetName } from './assetNames.js';

// Converts a regular string to its hex representation
function stringToHex(str) {
  let hex = '';
  for(let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i).toString(16);
    hex += charCode.padStart(2, '0');
  }
  return hex;
}

// Returns true if the wallet already holds the specific claim token
export async function hasAlreadyClaimed(walletAddress, campaign) {
  if (!walletAddress || !campaign) {
    throw new Error("walletAddress and campaign are required");
  }

  const assetName = getClaimAssetName(campaign);
  const assetNameHex = stringToHex(assetName);
  const targetUnit = `${claimPolicyId}${assetNameHex}`;

  try {
    // Fetch UTxOs for the target asset
    const utxos = await provider.fetchAddressUTxOs(walletAddress, targetUnit);
    return utxos.length > 0;
  } catch (error) {
    // 404 means no UTxOs yet
    if (error?.response?.status === 404 || error?.status === 404) {
      return false;
    }
    // Throw other errors for backend handling
    console.warn("hasAlreadyClaimed error:", error.message || error);
    throw new Error(`Failed to check claim status: ${error.message || error}`);
  }
}
