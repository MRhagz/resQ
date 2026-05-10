import { mintAidReceiptNFT } from "./mint-aid-receipt";
import { mockBeneficiaries, mockDistributions } from "./mock_data";

async function demoMintReceipt() {
    console.log("Starting Aid Receipt NFT Minting Demo...");

    try {
        const beneficiary = mockBeneficiaries[0];
        const distribution = mockDistributions[0];

        console.log(`Minting Aid Receipt for disaster: ${distribution.disasterCode}`);
        console.log(`Aid Type: ${distribution.aidType} provided by ${distribution.agency}`);
        console.log(`Recipient Address: ${beneficiary.walletAddress}`);

        const txHash = await mintAidReceiptNFT(beneficiary, distribution);

        console.log(`Success! Aid Receipt NFT Minted.`);
        console.log(`Transaction Hash: ${txHash}`);
    } catch (error) {
        console.error("Failed to mint Aid Receipt NFT:", error);
    }
}

demoMintReceipt();
