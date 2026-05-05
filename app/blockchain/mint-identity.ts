import { MeshWallet, Transaction, ForgeScript } from "@meshsdk/core";
import { signingWallet } from "./wallet";
import { Beneficiary } from "./metadata";

export async function mintIdentityNFT(beneficiary: Beneficiary) {
    const { systemUuid, walletAddress, region, province, municipality } = beneficiary;

    const cleanUuid = systemUuid.replace(/-/g, "");
    const assetName = `ResQId-${cleanUuid.substring(0, 25)}`;

    const forgingScript = ForgeScript.withOneSignature(await signingWallet.getChangeAddress());

    const asset = {
        assetName,
        assetQuantity: "1",
        metadata: {
            name: "ResQ Identity Token",
            // image: "ipfs://<identity_logo_cid>",
            description: "Verified ResQ Disaster Relief Beneficiary",
            status: "Verified",
            region,
            province,
            municipality,
            registration_date: new Date().toISOString().slice(0, 10),
            system_uuid: systemUuid,
        },
        label: "721" as const,
        recipient: walletAddress,
    };

    const tx = new Transaction({ initiator: signingWallet });
    tx.mintAsset(forgingScript, asset);

    const signed = await signingWallet.signTx(await tx.build());
    const txHash = await signingWallet.submitTx(signed);

    return txHash;
}