/**
 * KMSInterface — Abstract base class for all KMS providers.
 *
 * Every provider (Local, AWS, etc.) must extend this class and implement
 * all three methods.  The default implementations throw so that missing
 * overrides are caught immediately.
 */
export default class KMSInterface {
  /**
   * Persist a private key under the given index.
   * @param {string} index  — Logical key name, e.g. 'system:master' or 'custodial:7'
   * @param {string} privateKey — The raw private key (bech32 or hex)
   */
  async storeKey(index, privateKey) {
    throw new Error('Not implemented');
  }

  /**
   * Retrieve a previously stored private key.
   * @param {string} index
   * @returns {Promise<string>} The decrypted private key
   */
  async getKey(index) {
    throw new Error('Not implemented');
  }

  /**
   * Sign a Cardano transaction body and return the VKey witness hex.
   * The private key must NEVER leave this method boundary.
   * @param {string} index — Which key to sign with
   * @param {string} txBodyHex — The serialised transaction body (hex)
   * @returns {Promise<string>} The VKey witness in hex
   */
  async sign(index, txBodyHex) {
    throw new Error('Not implemented');
  }
}
