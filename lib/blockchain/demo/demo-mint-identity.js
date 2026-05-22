import { mintIdentityNFT } from '../mintIdentityNFT.js';
import { getIdentityAssetName } from '../assetNames.js';
import { getCustodialAddress } from '../wallet.js';

const mockBeneficiary = {
  systemUuid: "550e8400-e29b-41d4-a716-446655440000",
  region: "Region VII",
  province: "Cebu",
  municipality: "Talisay",
  // walletAddress will be assigned in main()
};

async function main() {
  console.log("=== Demo: Mint Identity NFT ===");
  mockBeneficiary.walletAddress = await getCustodialAddress(1);

  const assetName = getIdentityAssetName(mockBeneficiary.systemUuid);
  console.log(`Asset Name to be minted: ${assetName}`);
  console.log(`Minting to: ${mockBeneficiary.walletAddress}`);
  
  try {
    const txHash = await mintIdentityNFT(mockBeneficiary);
    console.log(`\nSuccess! Transaction Hash: ${txHash}`);
    console.log(`Explorer Link: https://preprod.cardanoscan.io/transaction/${txHash}`);
  } catch (error) {
    console.error("Failed to mint identity NFT:", error);
  }
}

main();
