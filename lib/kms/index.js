/**
 * KMS provider factory.
 *
 * Reads process.env.KMS_PROVIDER to decide which concrete provider to
 * instantiate.  Currently only 'local' (default) is implemented.
 *
 * Usage:
 *   import { kms } from '@/lib/kms';
 */
import LocalKMSProvider from './LocalKMSProvider.js';

const providerType = process.env.KMS_PROVIDER || 'local';

let kms;

switch (providerType) {
  case 'aws':
    // Future: import AWSKMSProvider from './AWSKMSProvider.js';
    throw new Error('AWS KMS provider is not yet implemented.');
  case 'local':
  default:
    kms = new LocalKMSProvider();
    break;
}

export { kms };
