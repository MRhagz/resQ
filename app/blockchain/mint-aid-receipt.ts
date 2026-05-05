import { MeshWallet, Transaction, ForgeScript } from "@meshsdk/core";
import { signingWallet } from "./wallet";
import { Beneficiary, Distribution } from "./metadata";

export async function mintAidReceiptNFT(beneficiary: Beneficiary, distribution: Distribution) {
    const { systemUuid, walletAddress } = beneficiary;
    const { disasterCode, aidType, agency, municipality } = distribution;

    const timestamp = Math.floor(Date.now() / 1000);
    // "RQAid-" (6) + uuid (4) + "-" (1) + disasterCode (8) + "-" (1) + timestamp (10) = 30 chars
    const shortDisasterCode = disasterCode.replace(/-/g, "").substring(0, 8);
    const assetName = `RQAid-${systemUuid.substring(0, 4)}-${shortDisasterCode}-${timestamp}`;

    const forgingScript = ForgeScript.withOneSignature(await signingWallet.getChangeAddress());

    const asset = {
        assetName,
        assetQuantity: "1",
        metadata: {
            name: "ResQ Aid Receipt",
            // image: "ipfs://<receipt_logo_cid>",
            disaster_code: disasterCode,
            aid_type: aidType,
            agency,
            municipality,
            system_uuid: systemUuid,
        },
        label: "721" as const,
        recipient: walletAddress,
    };

    const tx = new Transaction({ initiator: signingWallet });
    tx.mintAsset(forgingScript, asset);

    const signed = await signingWallet.signTx(await tx.build());
    const txHash = await signingWallet.submitTx(signed);

    return txHash; // to store in DB
}