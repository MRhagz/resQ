import { MeshWallet, BlockfrostProvider } from '@meshsdk/core';
import { NETWORK_ID, BLOCKFROST_API_KEY } from './constants.js';

if (!BLOCKFROST_API_KEY) {
  throw new Error("BLOCKFROST_API_KEY environment variable is required.");
}

const mnemonicStr = process.env.WALLET_MNEMONIC;
if (!mnemonicStr) {
  throw new Error("WALLET_MNEMONIC environment variable is required.");
}

export const provider = new BlockfrostProvider(BLOCKFROST_API_KEY);

export const wallet = new MeshWallet({
  networkId: NETWORK_ID,
  fetcher: provider,
  submitter: provider,
  key: {
    type: 'mnemonic',
    words: mnemonicStr.split(' '),
  },
});
