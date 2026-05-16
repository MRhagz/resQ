import { Transaction } from '@meshsdk/core';
import { wallet } from './wallet.js';
import { identityForgeScript } from './policies.js';
import { getIdentityAssetName } from './assetNames.js';
import { PLACEHOLDER_IPFS_CID } from './constants.js';

// Builds, signs, and submits a CIP-25 minting transaction for one identity NFT
export async function mintIdentityNFT(beneficiary) {
  const { systemUuid, walletAddress, region, province, municipality } = beneficiary;
  
  if (!systemUuid || !walletAddress) {
    throw new Error("systemUuid and walletAddress are required");
  }

  const assetName = getIdentityAssetName(systemUuid);

  const assetMetadata = {
    name: `ResQ Identity - ${systemUuid.substring(0, 8)}`,
    image: PLACEHOLDER_IPFS_CID,
    mediaType: 'image/png',
    description: 'ResQ Verified Beneficiary Identity',
    status: 'Verified',
    region: region || 'Unknown',
    province: province || 'Unknown',
    municipality: municipality || 'Unknown',
    registration_date: new Date().toISOString().split('T')[0],
    system_uuid: systemUuid
  };

  const tx = new Transaction({ initiator: wallet });

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
  const signedTx = await wallet.signTx(unsignedTx);
  const txHash = await wallet.submitTx(signedTx);

  return txHash;
}
