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

// The master system wallet, derived at index 0 (pays fees and holds policies)
export const systemWallet = new MeshWallet({
  networkId: NETWORK_ID,
  fetcher: provider,
  submitter: provider,
  key: {
    type: 'mnemonic',
    words: mnemonicStr.split(' '),
  },
  accountIndex: 0,
  keyIndex: 0
});

// Derives a read-only custodial wallet for a specific beneficiary index
export const getCustodialWallet = (index) => {
  return new MeshWallet({
    networkId: NETWORK_ID,
    key: {
      type: 'mnemonic',
      words: mnemonicStr.split(' '),
    },
    accountIndex: 0,
    keyIndex: index
  });
};

// Generates the address string for a specific beneficiary index
export const getCustodialAddress = async (index) => {
  const w = getCustodialWallet(index);
  await w.init(); // Requires initialization to generate addresses
  return w.getAddresses().baseAddressBech32;
};
