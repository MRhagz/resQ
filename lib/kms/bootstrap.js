/**
 * bootstrap.js — One-time key extraction and KMS population.
 *
 * Run this script ONCE after setting KMS_MASTER_KEY in .env to extract
 * the system wallet's private signing key from the mnemonic and store it
 * encrypted in the KMS keystore.
 *
 * Usage:
 *   node --env-file=.env lib/kms/bootstrap.js
 */
import { resolvePrivateKey } from '@meshsdk/core';
import { kms } from './index.js';

async function bootstrap() {
  const mnemonicStr = process.env.WALLET_MNEMONIC;
  if (!mnemonicStr) {
    throw new Error('WALLET_MNEMONIC environment variable is required.');
  }

  const words = mnemonicStr.split(' ');
  console.log('Deriving system signing key from mnemonic…');

  // resolvePrivateKey returns the bech32-encoded root private key
  const bech32PrivateKey = resolvePrivateKey(words);

  if (!bech32PrivateKey) {
    throw new Error('resolvePrivateKey returned empty. Check MeshSDK version.');
  }

  // Store encrypted in the KMS under the 'system:master' index
  await kms.storeKey('system:master', bech32PrivateKey);

  console.log('✅ System signing key bootstrapped into KMS.');
  console.log('   Keystore file: keystore.enc.json');
  console.log('   Key index:     system:master');
  console.log('\n   You can now run minting operations.');
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err.message || err);
  process.exit(1);
});
