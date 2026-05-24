import { MeshTxBuilder, resolveScriptHash, unixTimeToEnclosingSlot } from '@meshsdk/core';
import { systemWallet, signAndSubmit, provider } from './wallet.js';
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

  const txBuilder = new MeshTxBuilder({
    fetcher: provider,
    submitter: provider,
  });

  // Enforce validation bounds: Minting must only happen BEFORE the distribution starts (skipped in DEMO_MODE)
  if (campaign.startsAt && process.env.DEMO_MODE !== 'true') {
    const startsAtMs = new Date(campaign.startsAt).getTime();
    const startsAtSlot = unixTimeToEnclosingSlot(startsAtMs, slotConfig);
    txBuilder.invalidHereafter(startsAtSlot);
  }

  // Mint the entire batch quantity in a single call using the policy and native script
  txBuilder.mint(String(recipients.length), policyId, assetNameHex);
  txBuilder.mintingScript(claimForgeScript);

  // Attach metadata following the CIP-25 standard (label 721)
  txBuilder.metadataValue(721, {
    [policyId]: {
      [assetName]: assetMetadata,
    },
  });

  // Consolidate outputs to avoid duplicate UTxOs for the same recipient address
  const addressQuantities = {};
  for (const recipient of recipients) {
    if (!recipient.walletAddress) {
      throw new Error("recipient missing walletAddress");
    }
    const addr = recipient.walletAddress;
    addressQuantities[addr] = (addressQuantities[addr] || 0) + 1;
  }

  for (const [addr, qty] of Object.entries(addressQuantities)) {
    txBuilder.txOut(addr, [
      {
        unit: unit,
        quantity: String(qty),
      },
    ]);
  }

  const utxos = await systemWallet.getUtxos();
  const changeAddress = await systemWallet.getChangeAddress();

  txBuilder
    .changeAddress(changeAddress)
    .selectUtxosFrom(utxos);

  const unsignedTx = await txBuilder.complete();
  const txHash = await signAndSubmit(unsignedTx, 'system:master');

  return txHash;
}

