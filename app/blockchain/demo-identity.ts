import { mintIdentityNFT } from "./mint-identity";
import { mockBeneficiaries } from "./mock_data";

async function demoMintIdentity() {
    console.log("Starting Identity NFT Minting Demo...");

    try {
        const beneficiary = mockBeneficiaries[0];

        console.log(`Minting Identity NFT to address: ${beneficiary.walletAddress}`);
        console.log(`Beneficiary Region: ${beneficiary.region}, Province: ${beneficiary.province}`);

        const txHash = await mintIdentityNFT(beneficiary);

        console.log(`Success! Identity NFT Minted.`);
        console.log(`Transaction Hash: ${txHash}`);
    } catch (error) {
        console.error("Failed to mint Identity NFT:", error);
    }
}

demoMintIdentity();
