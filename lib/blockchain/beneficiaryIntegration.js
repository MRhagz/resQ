import { getCustodialAddress } from './wallet.js';
import { mintIdentityNFT } from './mintIdentityNFT.js';
import { createClient } from '@supabase/supabase-js';

/**
 * Processes wallet generation and Identity NFT minting for a beneficiary.
 * Runs completely in the background (fire-and-forget from the registration flow).
 *
 * Flow:
 *   1. Derive a custodial wallet address from the HD mnemonic
 *   2. Persist the address to the beneficiaries table
 *   3. Mint an Identity NFT to that address
 *   4. Save the transaction hash for audit
 */
export async function processBeneficiaryBlockchainIntegration(systemUuid, walletIndex, demographics = {}) {
  try {
    // 1. Generate the address
    const walletAddress = await getCustodialAddress(walletIndex);

    // 2. Persist the address to the database
    // Use the standard client to avoid Next.js cookie context errors in background tasks
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from('beneficiaries')
      .update({ wallet_address: walletAddress })
      .eq('system_uuid', systemUuid);

    if (updateError) {
      console.error('Failed to update beneficiary wallet address:', updateError);
      return;
    }

    // 3. Mint the Identity NFT
    const beneficiary = {
      systemUuid: systemUuid,
      walletAddress: walletAddress,
      region: demographics.region || 'Unknown',
      province: demographics.province || 'Unknown',
      municipality: demographics.municipality || 'N/A',
      barangay: demographics.barangay || 'Unknown',
      displayName: demographics.display_name || 'Anonymous'
    };

    const txHash = await mintIdentityNFT(beneficiary);

    // 4. Save the transaction hash
    await supabase
      .from('beneficiaries')
      .update({ identity_tx_hash: txHash })
      .eq('system_uuid', systemUuid);
  } catch (error) {
    console.error(`[Blockchain] Beneficiary integration failed for ${systemUuid}:`, error);
    // Non-blocking — the DB registration is already complete
  }
}
