import { MeshTxBuilder, resolveScriptHash } from '@meshsdk/core';
import { systemWallet, signAndSubmit, provider } from './wallet.js';
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

  const policyId = resolveScriptHash(identityForgeScript);
  const assetNameHex = Buffer.from(assetName, 'utf8').toString('hex');
  const unit = policyId + assetNameHex;

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

  const txBuilder = new MeshTxBuilder({
    fetcher: provider,
    submitter: provider,
  });

  // Mint the identity NFT
  txBuilder.mint('1', policyId, assetNameHex);
  txBuilder.mintingScript(identityForgeScript);

  // Attach metadata following CIP-25 standard (label 721)
  txBuilder.metadataValue(721, {
    [policyId]: {
      [assetName]: assetMetadata,
    },
  });

  // Send the minted token to the beneficiary's wallet address
  txBuilder.txOut(walletAddress, [
    {
      unit: unit,
      quantity: '1',
    },
  ]);

  const utxos = await systemWallet.getUtxos();
  const changeAddress = await systemWallet.getChangeAddress();

  txBuilder
    .changeAddress(changeAddress)
    .selectUtxosFrom(utxos);

  const unsignedTx = await txBuilder.complete();
  const txHash = await signAndSubmit(unsignedTx, 'system:master');

  return txHash;
}

