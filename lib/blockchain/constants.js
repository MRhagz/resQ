// blockchain/constants.js

export const NETWORK = process.env.NETWORK || 'preprod';
export const NETWORK_ID = NETWORK === 'mainnet' ? 1 : 0;
export const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY || '';

export const IDENTITY_IPFS_CID = 'ipfs://QmaSQ128zfknojFSHGgyGfBi1PvofhPvGMbj85A1Uao5jY';
export const CLAIM_STUB_IPFS_CID = 'ipfs://QmX3PjCw3V1AFjw9VLxeoHVBPQxXRF731eK8R2uqb3GhNg';
