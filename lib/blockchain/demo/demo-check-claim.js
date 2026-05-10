import { hasAlreadyClaimed } from '../checkClaimStatus.js';
import { getCustodialAddress } from '../wallet.js';

const mockCampaign = {
  disasterCode: "TY-2026-001",
  aidType: "Food Ration",
  agency: "DSWD",
  region: "Region VII"
};

async function main() {
  console.log("=== Demo: Check Claim Status ===");
  const walletAddress = await getCustodialAddress(1);
  console.log(`Checking claims for wallet: ${walletAddress}`);
  
  try {
    const hasClaimed = await hasAlreadyClaimed(walletAddress, mockCampaign);
    console.log(`\nHas the wallet claimed this campaign? ${hasClaimed}`);
    
    if (hasClaimed) {
      console.log("The user ALREADY HAS the claim stub.");
    } else {
      console.log("The user DOES NOT HAVE the claim stub yet.");
    }
  } catch (error) {
    console.error("Failed to check claim status:", error);
  }
}

main();
