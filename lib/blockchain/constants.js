// blockchain/constants.js

export const NETWORK = process.env.NETWORK || 'preprod';
export const NETWORK_ID = NETWORK === 'mainnet' ? 1 : 0;
export const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY || '';

export const PLACEHOLDER_IPFS_CID = 'ipfs://QmPlaceholder';
