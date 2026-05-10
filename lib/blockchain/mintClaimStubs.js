import { Transaction } from '@meshsdk/core';
import { systemWallet } from './wallet.js';
import { getSystemPolicy } from './policies.js';
import { getClaimAssetName } from './assetNames.js';
import { PLACEHOLDER_IPFS_CID } from './constants.js';

// Mints fungible claim tokens to each recipient in a single transaction
export async function mintClaimStubs(recipients, campaign) {
  if (!recipients || !recipients.length) {
    throw new Error("recipients array is required and cannot be empty");
  }
  if (!campaign) {
    throw new Error("campaign object is required");
  }

  const assetName = getClaimAssetName(campaign);
  const { claimForgeScript } = await getSystemPolicy();

  const assetMetadata = {
    name: `ResQ Claim: ${campaign.disasterCode}`,
    image: PLACEHOLDER_IPFS_CID,
    mediaType: 'image/png',
    description: `Claim stub for ${campaign.aidType}`,
    disaster_code: campaign.disasterCode,
    aid_type: campaign.aidType,
    agency: campaign.agency,
    region: campaign.region || 'Unknown'
  };

  const tx = new Transaction({ initiator: systemWallet });

  for (const recipient of recipients) {
    if (!recipient.walletAddress) {
      throw new Error("recipient missing walletAddress");
    }
    tx.mintAsset(
      claimForgeScript,
      {
        assetName: assetName,
        assetQuantity: '1',
        metadata: assetMetadata,
        label: '721',
        recipient: recipient.walletAddress,
      }
    );
  }

  const unsignedTx = await tx.build();
  const signedTx = await systemWallet.signTx(unsignedTx);
  const txHash = await systemWallet.submitTx(signedTx);

  return txHash;
}
