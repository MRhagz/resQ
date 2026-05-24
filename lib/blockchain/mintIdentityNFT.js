import { Transaction } from '@meshsdk/core';
import { systemWallet, signAndSubmit } from './wallet.js';
import { getSystemPolicy } from './policies.js';
import { getIdentityAssetName } from './assetNames.js';
import { IDENTITY_IPFS_CID } from './constants.js';

// Builds, signs, and submits a CIP-25 minting transaction for one identity NFT
export async function mintIdentityNFT(beneficiary) {
  const { systemUuid, walletAddress, region, province, municipality, barangay, displayName } = beneficiary;

  if (!systemUuid || !walletAddress) {
    throw new Error("systemUuid and walletAddress are required");
  }

  const assetName = getIdentityAssetName(systemUuid);
  await systemWallet.init();
  const { identityForgeScript } = await getSystemPolicy();

  const assetMetadata = {
    name: `ResQ Identity - ${systemUuid.substring(0, 8)}`,
    image: IDENTITY_IPFS_CID,
    mediaType: 'image/png',
    description: 'ResQ Verified Beneficiary Identity',
    status: 'Verified',
    display_name: displayName || 'Anonymous',
    region: region || 'Unknown',
    province: province || 'Unknown',
    municipality: municipality || 'Unknown',
    barangay: barangay || 'Unknown',
    registration_date: new Date().toISOString().split('T')[0],
    system_uuid: systemUuid
  };

  const tx = new Transaction({ initiator: systemWallet });

  tx.mintAsset(
    identityForgeScript,
    {
      assetName: assetName,
      assetQuantity: '1',
      metadata: assetMetadata,
      label: '721',
      recipient: walletAddress,
    }
  );

  const unsignedTx = await tx.build();
  const txHash = await signAndSubmit(unsignedTx, 'system:master');

  return txHash;
}
