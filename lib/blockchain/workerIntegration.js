import { getCustodialAddress } from './wallet.js';
import { mintIdentityNFT } from './mintIdentityNFT.js';
import { createClient } from '@supabase/supabase-js'; 

// Processes the wallet generation and minting completely in the background
export async function processWorkerBlockchainIntegration(workerId, walletIndex) {
  try {
    // 1. Generate the address
    const walletAddress = await getCustodialAddress(walletIndex);
    
    // 2. Persist the address to the database so we don't have to re-derive it constantly
    // Use the standard client to avoid Next.js cookie context errors in background tasks
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error: updateError } = await supabase
      .from('staff_profiles')
      .update({ wallet_address: walletAddress })
      .eq('id', workerId);
      
    if (updateError) {
      console.error('Failed to update worker wallet address:', updateError);
      return;
    }

    // 3. Trigger the Identity NFT Minting
    // We mock the region/province for now since it's a worker, not a full beneficiary
    const mockBeneficiary = {
      systemUuid: workerId,
      walletAddress: walletAddress,
      region: 'Worker-Region',
      province: 'Worker-Province',
      municipality: 'N/A'
    };

    const txHash = await mintIdentityNFT(mockBeneficiary);
    
    // 4. Save the transaction hash
    await supabase
      .from('staff_profiles')
      .update({ tx_hash: txHash })
      .eq('id', workerId);
  } catch (error) {
    console.error(`Blockchain integration failed for worker ${workerId}:`, error);
  }
}
