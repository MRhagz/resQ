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
  const CardanoWasm = await getCSL();
  const txBytes = Buffer.from(unsignedTxHex, 'hex');
  const unsignedTx = CardanoWasm.Transaction.from_bytes(txBytes);

  // 1. Build a temporary transaction using standard CSL to get standard-serialized body bytes
  // Derive fresh pointers from unsignedTx to satisfy WASM ownership
  const tempTx = CardanoWasm.Transaction.new(
    unsignedTx.body(),
    unsignedTx.witness_set(),
    unsignedTx.auxiliary_data()
  );
  const tempBytes = tempTx.to_bytes();

  // 2. Extract the exact final transaction body hash using FixedTransaction on standard bytes
  const fixedTempTx = CardanoWasm.FixedTransaction.from_bytes(tempBytes);
  const finalTxHashHex = Buffer.from(fixedTempTx.transaction_hash().to_bytes()).toString('hex');

  // Free temporary objects early
  tempTx.free();
  fixedTempTx.free();

  // 3. Delegate signing to the KMS using the standard-aligned hash
  const witnessHex = await kms.sign(signingIndex, finalTxHashHex);
  const witness = CardanoWasm.Vkeywitness.from_bytes(Buffer.from(witnessHex, 'hex'));

  // 4. Add the KMS signature to a fresh witness set from the unsigned transaction
  const finalWitnessSet = unsignedTx.witness_set();
  let vkeyWitnesses = finalWitnessSet.vkeys();
  if (!vkeyWitnesses) {
    vkeyWitnesses = CardanoWasm.Vkeywitnesses.new();
  }
  vkeyWitnesses.add(witness);
  finalWitnessSet.set_vkeys(vkeyWitnesses);

  // 5. Construct the final signed transaction using fresh body and auxiliary data pointers
  const signedTx = CardanoWasm.Transaction.new(
    unsignedTx.body(),
    finalWitnessSet,
    unsignedTx.auxiliary_data()
  );
  const signedTxHex = Buffer.from(signedTx.to_bytes()).toString('hex');

  // 6. Clean up CSL objects
  unsignedTx.free();
  witness.free();
  finalWitnessSet.free();
  signedTx.free();

  // 7. Submit via Blockfrost
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

  const CardanoWasm = await getCSL();
  const txBytes = Buffer.from(unsignedTxHex, 'hex');
  const unsignedTx = CardanoWasm.Transaction.from_bytes(txBytes);

  // 1. Build a temporary transaction using standard CSL to get standard-serialized body bytes
  // Derive fresh pointers from unsignedTx to satisfy WASM ownership
  const tempTx = CardanoWasm.Transaction.new(
    unsignedTx.body(),
    unsignedTx.witness_set(),
    unsignedTx.auxiliary_data()
  );
  const tempBytes = tempTx.to_bytes();

  // 2. Extract the exact final transaction body hash using FixedTransaction on standard bytes
  const fixedTempTx = CardanoWasm.FixedTransaction.from_bytes(tempBytes);
  const finalTxHashHex = Buffer.from(fixedTempTx.transaction_hash().to_bytes()).toString('hex');

  // Free temporary objects early
  tempTx.free();
  fixedTempTx.free();

  // 3. Fetch all witnesses from the KMS sequentially using the standard-aligned hash
  const witnessesHex = [];
  for (const index of signingIndexes) {
    const witness = await kms.sign(index, finalTxHashHex);
    witnessesHex.push(witness);
  }

  // 4. Add all gathered signatures to a fresh witness set from the unsigned transaction
  const finalWitnessSet = unsignedTx.witness_set();
  let vkeyWitnesses = finalWitnessSet.vkeys();
  if (!vkeyWitnesses) {
    vkeyWitnesses = CardanoWasm.Vkeywitnesses.new();
  }

  for (const witnessHex of witnessesHex) {
    const witness = CardanoWasm.Vkeywitness.from_bytes(Buffer.from(witnessHex, 'hex'));
    vkeyWitnesses.add(witness);
    witness.free();
  }
  finalWitnessSet.set_vkeys(vkeyWitnesses);

  // 5. Construct the final signed transaction using fresh body and auxiliary data pointers
  const signedTx = CardanoWasm.Transaction.new(
    unsignedTx.body(),
    finalWitnessSet,
    unsignedTx.auxiliary_data()
  );
  const signedTxHex = Buffer.from(signedTx.to_bytes()).toString('hex');

  // 6. Clean up CSL objects
  unsignedTx.free();
  finalWitnessSet.free();
  signedTx.free();

  // 7. Submit to network
  const txHash = await provider.submitTx(signedTxHex);
  return txHash;
}
