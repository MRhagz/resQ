import { Transaction, resolveScriptHash, unixTimeToEnclosingSlot } from '@meshsdk/core';
import { systemWallet, signAndSubmit } from './wallet.js';
import { getCampaignClaimPolicy, slotConfig } from './policies.js';
import { getClaimAssetName } from './assetNames.js';
import { CLAIM_STUB_IPFS_CID } from './constants.js';

// Mints fungible claim tokens to each recipient in a single transaction
export async function mintClaimStubs(recipients, campaign) {
  if (!recipients || !recipients.length) {
    throw new Error("recipients array is required and cannot be empty");
  }
  if (!campaign) {
    throw new Error("campaign object is required");
  }

  const assetName = getClaimAssetName(campaign);
  await systemWallet.init();
  const { claimForgeScript } = await getCampaignClaimPolicy(campaign);
  const systemAddress = await systemWallet.getChangeAddress();

  const policyId = resolveScriptHash(claimForgeScript);
  const assetNameHex = Buffer.from(assetName, 'utf8').toString('hex');
  const unit = policyId + assetNameHex;

  const assetMetadata = {
    name: `ResQ Claim: ${campaign.disasterCode}`,
    image: CLAIM_STUB_IPFS_CID,
    mediaType: 'image/png',
    description: `Claim stub for ${campaign.aidType}`,
    disaster_code: campaign.disasterCode,
    disaster_name: campaign.disasterName || 'Unknown Campaign',
    aid_type: campaign.aidType,
    agency: campaign.agency,
    region: campaign.region || 'Unknown',
    allowed_regions: campaign.allowedRegions || []
  };

  const tx = new Transaction({ initiator: systemWallet });

  // Enforce validation bounds: Minting must only happen BEFORE the distribution starts (skipped in DEMO_MODE)
  if (campaign.startsAt && process.env.DEMO_MODE !== 'true') {
    const startsAtMs = new Date(campaign.startsAt).getTime();
    const startsAtSlot = unixTimeToEnclosingSlot(startsAtMs, slotConfig);
    tx.setTimeToExpire(String(startsAtSlot));
  }

  // Mint the entire batch quantity to the system wallet in a single call
  tx.mintAsset(
    claimForgeScript,
    {
      assetName: assetName,
      assetQuantity: String(recipients.length),
      metadata: assetMetadata,
      label: '721',
      recipient: systemAddress,
    }
  );

  // If a recipient has a different wallet address (e.g. non-custodial or demo),
  // distribute their token to their address.
  for (const recipient of recipients) {
    if (!recipient.walletAddress) {
      throw new Error("recipient missing walletAddress");
    }
    if (recipient.walletAddress !== systemAddress) {
      tx.sendAssets(recipient.walletAddress, [
        {
          unit: unit,
          quantity: '1',
        }
      ]);
    }
  }

  const unsignedTx = await tx.build();
  const txHash = await signAndSubmit(unsignedTx, 'system:master');

  return txHash;
}
