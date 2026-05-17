import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import KMSInterface from './KMSInterface.js';
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

const KEYSTORE_PATH = resolve(process.cwd(), 'keystore.enc.json');
const ALGORITHM = 'aes-256-gcm';

/**
 * LocalKMSProvider — Development-grade KMS using AES-256-GCM.
 *
 * Keys are encrypted at rest in `keystore.enc.json`.
 * Cardano signing is performed entirely within this class via CSL —
 * private keys never leave the KMS boundary.
 *
 * In production, swap this for AWSKMSProvider with zero code changes.
 */
export default class LocalKMSProvider extends KMSInterface {
  constructor() {
    super();

    const masterKeyHex = process.env.KMS_MASTER_KEY;
    if (!masterKeyHex || masterKeyHex.length !== 64) {
      throw new Error(
        'KMS_MASTER_KEY must be a 64-character hex string (32 bytes). ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }
    this._masterKey = Buffer.from(masterKeyHex, 'hex');

    // Load or initialise keystore
    if (existsSync(KEYSTORE_PATH)) {
      try {
        this.keys = JSON.parse(readFileSync(KEYSTORE_PATH, 'utf-8'));
      } catch {
        this.keys = {};
      }
    } else {
      this.keys = {};
    }
  }

  // ── Encryption helpers ──────────────────────────────────────────────

  _encrypt(plaintext) {
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, this._masterKey, iv);
    let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return { iv: iv.toString('hex'), tag, data: encrypted };
  }

  _decrypt(record) {
    const decipher = createDecipheriv(
      ALGORITHM,
      this._masterKey,
      Buffer.from(record.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(record.tag, 'hex'));
    let decrypted = decipher.update(record.data, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
  }

  _save() {
    writeFileSync(KEYSTORE_PATH, JSON.stringify(this.keys, null, 2));
  }

  // ── KMSInterface implementation ─────────────────────────────────────

  async storeKey(index, privateKey) {
    this.keys[index] = this._encrypt(privateKey);
    this._save();
    console.log(`[KMS] Key stored: ${index}`);
  }

  async getKey(index) {
    const record = this.keys[index];
    if (!record) {
      throw new Error(`No key found for index: ${index}`);
    }
    return this._decrypt(record);
  }

  async sign(index, txHashHex) {
    // 1. Retrieve the private key — stays in this function scope only
    const bech32Key = await this.getKey(index);

    // 2. Deserialise using CSL (lazy-loaded)
    const CardanoWasm = await getCSL();
    let privateKey;
    if (bech32Key.startsWith('xprv')) {
      const bip32Key = CardanoWasm.Bip32PrivateKey.from_bech32(bech32Key);
      
      // Derive the standard payment key: m / 1852' / 1815' / 0' / 0 / 0
      const harden = (num) => 0x80000000 + num;
      const accountKey = bip32Key
        .derive(harden(1852))
        .derive(harden(1815))
        .derive(harden(0));
        
      const paymentKey = accountKey
        .derive(0)
        .derive(0); // keyIndex 0 for system wallet
        
      privateKey = paymentKey.to_raw_key();
      
      bip32Key.free();
      accountKey.free();
      paymentKey.free();
    } else {
      privateKey = CardanoWasm.PrivateKey.from_bech32(bech32Key);
    }
    
    // 3. Parse the transaction hash
    const txHash = CardanoWasm.TransactionHash.from_hex(txHashHex);

    // 4. Produce VKey witness
    const witness = CardanoWasm.make_vkey_witness(txHash, privateKey);
    const witnessHex = Buffer.from(witness.to_bytes()).toString('hex');

    // 5. Clean up CSL objects
    privateKey.free();
    txHash.free();
    witness.free();

    return witnessHex;
  }
}
