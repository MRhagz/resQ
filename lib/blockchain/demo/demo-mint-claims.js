import { mintClaimStubs } from '../mintClaimStubs.js';
import { getClaimAssetName } from '../assetNames.js';
import { wallet } from '../wallet.js';

const mockCampaign = {
  disasterCode: "TY-2026-001",
  aidType: "Food Ration",
  agency: "DSWD",
  region: "Region VII"
};

const mockRecipients = [
  {
    systemUuid: "550e8400-e29b-41d4-a716-446655440000",
    walletAddress: wallet.getPaymentAddress() // Mint to self for demo
  }
];

async function main() {
  console.log("=== Demo: Mint Claim Stubs ===");
  const assetName = getClaimAssetName(mockCampaign);
  console.log(`Asset Name to be minted: ${assetName}`);
  console.log(`Recipients count: ${mockRecipients.length}`);
  
  try {
    const txHash = await mintClaimStubs(mockRecipients, mockCampaign);
    console.log(`\nSuccess! Transaction Hash: ${txHash}`);
    console.log(`Explorer Link: https://preprod.cardanoscan.io/transaction/${txHash}`);
  } catch (error) {
    console.error("Failed to mint claim stubs:", error);
  }
}

main();
