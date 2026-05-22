import { MeshWallet, BlockfrostProvider, resolveTxHash } from '@meshsdk/core';
import { NETWORK_ID, BLOCKFROST_API_KEY } from './constants.js';
import { kms } from '../kms/index.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Lazy-loaded to avoid Turbopack WASM bundling issues at build time
let _CardanoWasm = null;
async function getCSL() {
  if (!_CardanoWasm) {
    _CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
  }
  return _CardanoWasm;
}

if (!BLOCKFROST_API_KEY) {
  throw new Error("BLOCKFROST_API_KEY environment variable is required.");
}

const mnemonicStr = process.env.WALLET_MNEMONIC;
if (!mnemonicStr) {
  throw new Error("WALLET_MNEMONIC environment variable is required.");
}

export const provider = new BlockfrostProvider(BLOCKFROST_API_KEY);

// The master system wallet, derived at index 0 (pays fees and holds policies)
// Used ONLY for address derivation and transaction building — never for signing
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
    keyIndex: Number(index)
  });
};

// Generates the address string for a specific beneficiary index
export const getCustodialAddress = async (index) => {
  const w = getCustodialWallet(index);
  await w.init(); // Requires initialization to generate addresses
  const addr = w.getAddresses().baseAddressBech32;
  if (!addr) throw new Error(`Failed to derive address for key index ${index}`);
  return addr;
};

/**
 * Signs an unsigned transaction via the KMS and submits it to the network.
 * Private keys never leave the KMS boundary.
 *
 * @param {string} unsignedTxHex — The unsigned transaction CBOR (hex), from tx.build()
 * @param {string} signingIndex — The KMS key index, e.g. 'system:master'
 * @returns {Promise<string>} The submitted transaction hash
 */
export async function signAndSubmit(unsignedTxHex, signingIndex = 'system:master') {
  // 1. Resolve the transaction hash using Mesh
  const txHashHex = resolveTxHash(unsignedTxHex);

  // 2. Delegate signing to the KMS — key never touches this module
  const witnessHex = await kms.sign(signingIndex, txHashHex);

  // 3. Reassemble the signed transaction
  const CardanoWasm = await getCSL();
  const txBytes = Buffer.from(unsignedTxHex, 'hex');
  const unsignedTx = CardanoWasm.Transaction.from_bytes(txBytes);
  const txBody = unsignedTx.body();
  const witness = CardanoWasm.Vkeywitness.from_bytes(Buffer.from(witnessHex, 'hex'));
  
  // Get the existing witness set (contains scripts for minting, etc.)
  const witnessSet = unsignedTx.witness_set();
  
  // Get existing vkey witnesses or create a new collection
  let vkeyWitnesses = witnessSet.vkeys();
  if (!vkeyWitnesses) {
    vkeyWitnesses = CardanoWasm.Vkeywitnesses.new();
  }
  
  // Add our KMS signature
  vkeyWitnesses.add(witness);
  witnessSet.set_vkeys(vkeyWitnesses);

  const signedTx = CardanoWasm.Transaction.new(
    txBody,
    witnessSet,
    unsignedTx.auxiliary_data()
  );

  const signedTxHex = Buffer.from(signedTx.to_bytes()).toString('hex');

  // 4. Clean up CSL objects
  unsignedTx.free();
  txBody.free();
  witness.free();
  // Don't free witnessSet or vkeyWitnesses here as they belong to the signedTx which we serialize next
  signedTx.free();

  // 5. Submit via Blockfrost
  const txHash = await provider.submitTx(signedTxHex);
  return txHash;
}

/**
 * Signs an unsigned transaction hex with multiple KMS key indexes sequentially
 * and submits it as a fully signed multi-signature transaction.
 *
 * @param {string} unsignedTxHex — Unsigned transaction CBOR (hex)
 * @param {string[]} signingIndexes — Array of KMS key indexes (e.g. ['system:master', 'wallet:5', 'wallet:8'])
 * @returns {Promise<string>} The submitted transaction hash
 */
export async function signAndSubmitMultiSig(unsignedTxHex, signingIndexes) {
  if (!Array.isArray(signingIndexes) || signingIndexes.length === 0) {
    throw new Error("signingIndexes array is required and cannot be empty");
  }

  // 1. Resolve transaction hash
  const txHashHex = resolveTxHash(unsignedTxHex);

  // 2. Fetch all witnesses from the KMS sequentially
  const witnessesHex = [];
  for (const index of signingIndexes) {
    const witness = await kms.sign(index, txHashHex);
    witnessesHex.push(witness);
  }

  // 3. Reassemble the multi-sig signed transaction
  const CardanoWasm = await getCSL();
  const txBytes = Buffer.from(unsignedTxHex, 'hex');
  const unsignedTx = CardanoWasm.Transaction.from_bytes(txBytes);
  const txBody = unsignedTx.body();
  const witnessSet = unsignedTx.witness_set();

  let vkeyWitnesses = witnessSet.vkeys();
  if (!vkeyWitnesses) {
    vkeyWitnesses = CardanoWasm.Vkeywitnesses.new();
  }

  // Add all gathered signatures
  for (const witnessHex of witnessesHex) {
    const witness = CardanoWasm.Vkeywitness.from_bytes(Buffer.from(witnessHex, 'hex'));
    vkeyWitnesses.add(witness);
  }
  witnessSet.set_vkeys(vkeyWitnesses);

  const signedTx = CardanoWasm.Transaction.new(
    txBody,
    witnessSet,
    unsignedTx.auxiliary_data()
  );

  const signedTxHex = Buffer.from(signedTx.to_bytes()).toString('hex');

  // 4. Clean up CSL objects
  unsignedTx.free();
  txBody.free();
  signedTx.free();

  // 5. Submit
  const txHash = await provider.submitTx(signedTxHex);
  return txHash;
}
