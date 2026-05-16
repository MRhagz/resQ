import { MeshWallet, BlockfrostProvider } from "@meshsdk/core";

const blockfrostApiKey = "previewWrzCr9V9nm4WV5WLNYB1blZfPIWkdxrH";
const mnemonicPhrase = "close twin ivory prosper valley easily maximum welcome ask viable hurdle depend outer witness kite ignore drink cash super win transfer rug size raise";

const provider = new BlockfrostProvider(blockfrostApiKey);

export const signingWallet = new MeshWallet({
    networkId: 0,
    fetcher: provider,
    submitter: provider,
    key: {
        type: "mnemonic",
        words: mnemonicPhrase.split(" "), // space-separated string of 24 words (seed phrase)
    },
});

