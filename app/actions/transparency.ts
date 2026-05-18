'use server'

import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'

/**
 * BENEFICIARY TOKEN LOOKUP — Public transparency feature.
 *
 * Allows beneficiaries to look up their claim history by providing
 * their PhilSys Number (hashed on-server for privacy).
 *
 * Returns:
 *   - All claim stubs (eligible/claimed) linked to the beneficiary
 *   - Associated disaster event info
 *   - No PII is returned — only hashed references and timestamps
 */

interface TokenHistoryResult {
  status: 'success' | 'error' | 'not_found'
  message: string
  beneficiary?: {
    systemId: string
    registeredAt: string
    region: string
  }
  tokens?: {
    id: string
    disasterName: string
    disasterCode: string
    aidType: string
    agency: string
    claimed: boolean
    claimedAt: string | null
    createdAt: string
  }[]
}

export async function lookupBeneficiaryTokens(
  nationalId: string
): Promise<TokenHistoryResult> {
  if (!nationalId || !nationalId.trim()) {
    return { status: 'error', message: 'National ID is required.' }
  }

  const supabase = await createClient()
  const trimmedId = nationalId.trim()

  // Strategy 1: Hash the ID the same way registration does (real registrations)
  const salt = process.env.SYSTEM_HASH_SALT
  if (salt) {
    const sanitizedId = trimmedId.replace(/\s+/g, '').toUpperCase()
    const idHash = crypto
      .createHash('sha256')
      .update(sanitizedId + salt)
      .digest('hex')

    const { data: beneficiary } = await supabase
      .from('beneficiaries')
      .select('system_uuid, general_demographics, created_at')
      .eq('id_hash', idHash)
      .single()

    if (beneficiary) return await fetchTokenHistory(supabase, beneficiary)
  }

  // Strategy 2: Raw id_hash lookup (seeded/test data with plain-text hashes)
  const { data: rawMatch } = await supabase
    .from('beneficiaries')
    .select('system_uuid, general_demographics, created_at')
    .eq('id_hash', trimmedId)
    .single()

  if (rawMatch) return await fetchTokenHistory(supabase, rawMatch)

  // Strategy 3: Lookup by system_uuid (user may have their wallet ID)
  const { data: uuidMatch } = await supabase
    .from('beneficiaries')
    .select('system_uuid, general_demographics, created_at')
    .eq('system_uuid', trimmedId)
    .single()

  if (uuidMatch) return await fetchTokenHistory(supabase, uuidMatch)

  // Strategy 4: Partial id_hash match (e.g. user enters "maria" and we find "hash_maria_santos")
  const { data: partialMatches } = await supabase
    .from('beneficiaries')
    .select('system_uuid, general_demographics, created_at')
    .ilike('id_hash', `%${trimmedId}%`)
    .limit(1)
    .single()

  if (partialMatches) return await fetchTokenHistory(supabase, partialMatches)

  return {
    status: 'not_found',
    message:
      'No beneficiary found with this ID. You may not be registered in the system yet.',
  }
}

async function fetchTokenHistory(
  supabase: any,
  beneficiary: {
    system_uuid: string
    general_demographics: any
    created_at: string
  }
): Promise<TokenHistoryResult> {
  const demo = (beneficiary.general_demographics as Record<string, unknown>) ?? {}

  // 1. Fetch claim stubs from database (has disaster context)
  const { data: stubs, error: stubError } = await supabase
    .from('claim_stubs')
    .select(
      'id, disaster_event_id, aid_type, agency, claimed, claimed_at, created_at'
    )
    .eq('beneficiary_uuid', beneficiary.system_uuid)
    .order('created_at', { ascending: false })

  if (stubError) {
    console.error('Fetch stubs error:', stubError)
    return { status: 'error', message: 'Failed to fetch token history.' }
  }

  // 2. Fetch associated disaster events for context
  const disasterIds = [
    ...new Set((stubs ?? []).map((s: any) => s.disaster_event_id)),
  ]

  let disasterMap: Record<string, { name: string; system_code: string }> = {}

  if (disasterIds.length > 0) {
    const { data: disasters } = await supabase
      .from('disaster_events')
      .select('id, name, system_code')
      .in('id', disasterIds)

    if (disasters) {
      disasterMap = Object.fromEntries(
        disasters.map((d: any) => [d.id, { name: d.name, system_code: d.system_code }])
      )
    }
  }

  // 3. Check blockchain for on-chain claim tokens in this beneficiary's wallet
  let onChainTokens: any[] = []
  const walletAddress = (demo.wallet_address as string) ?? null

  if (walletAddress && process.env.BLOCKFROST_API_KEY) {
    try {
      const { fetchWalletClaimTokens } = await import('@/lib/blockchain/fetchLedger.js')
      const { claimPolicyId } = await import('@/lib/blockchain/policies.js')
      onChainTokens = await fetchWalletClaimTokens(walletAddress, claimPolicyId)
    } catch (e: any) {
      console.warn('Blockchain wallet lookup failed:', e.message)
    }
  }

  // 4. Build response — merge database stubs with on-chain verification
  const tokens = (stubs ?? []).map((s: any) => {
    const disaster = disasterMap[s.disaster_event_id] ?? {
      name: 'Unknown',
      system_code: '???',
    }

    // Check if this stub's token exists on-chain
    const onChainMatch = onChainTokens.find(
      (t: any) => t.disasterCode === disaster.system_code || t.aidType === s.aid_type
    )

    return {
      id: s.id,
      disasterName: disaster.name,
      disasterCode: disaster.system_code,
      aidType: s.aid_type,
      agency: s.agency,
      claimed: s.claimed,
      claimedAt: s.claimed_at,
      createdAt: s.created_at,
      // On-chain enrichment
      onChain: !!onChainMatch,
      txHash: onChainMatch?.txHash ?? null,
    }
  })

  // 5. Add any on-chain tokens not in the database (minted directly)
  for (const onChain of onChainTokens) {
    const alreadyMapped = tokens.some(
      (t: any) => t.disasterCode === onChain.disasterCode && t.aidType === onChain.aidType
    )
    if (!alreadyMapped) {
      tokens.push({
        id: `onchain-${onChain.unit}`,
        disasterName: onChain.disasterCode,
        disasterCode: onChain.disasterCode,
        aidType: onChain.aidType,
        agency: onChain.agency,
        claimed: true, // If it's in the wallet, it's been minted/claimed
        claimedAt: null,
        createdAt: new Date().toISOString(),
        onChain: true,
        txHash: onChain.txHash,
      })
    }
  }

  return {
    status: 'success',
    message: `Found ${tokens.length} token(s) for this beneficiary.${onChainTokens.length > 0 ? ` (${onChainTokens.length} verified on-chain)` : ''}`,
    beneficiary: {
      systemId: beneficiary.system_uuid,
      registeredAt: beneficiary.created_at,
      region: (demo.region as string) ?? 'Unknown',
    },
    tokens,
  }
}


/**
 * PUBLIC LEDGER DATA — Fetches real-time distribution data from the
 * Cardano blockchain via Blockfrost for the transparency portal.
 *
 * Queries all minted claim stub tokens under the system policy ID,
 * reads their CIP-25 on-chain metadata, and returns structured entries.
 */

export interface LedgerEntry {
  id: string
  beneficiaryId: string
  beneficiaryDisplay: string
  disasterCode: string
  disasterName: string
  aidType: string
  agency: string
  claimed: boolean
  claimedAt: string | null
  createdAt: string
  // Blockchain-specific fields
  txHash?: string
  fingerprint?: string
  quantity?: number
}

export interface LedgerData {
  entries: LedgerEntry[]
  metrics: {
    totalStubs: number
    claimedCount: number
    activeCampaigns: number
  }
  source: 'blockchain' | 'unavailable'
  policyId?: string
}

export async function fetchPublicLedger(): Promise<LedgerData> {
  const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY

  if (!BLOCKFROST_API_KEY) {
    console.warn('BLOCKFROST_API_KEY not set — blockchain ledger unavailable')
    return {
      entries: [],
      metrics: { totalStubs: 0, claimedCount: 0, activeCampaigns: 0 },
      source: 'unavailable',
    }
  }

  try {
    // Dynamic import to avoid throwing if wallet env vars are missing at module level
    const { fetchBlockchainLedger } = await import('@/lib/blockchain/fetchLedger.js')

    // Resolve the claim policy ID
    let policyId: string
    try {
      const { claimPolicyId } = await import('@/lib/blockchain/policies.js')
      policyId = claimPolicyId
    } catch (e) {
      console.warn('Could not resolve claimPolicyId — WALLET_MNEMONIC may not be set')
      return {
        entries: [],
        metrics: { totalStubs: 0, claimedCount: 0, activeCampaigns: 0 },
        source: 'unavailable',
      }
    }

    const ledger = await fetchBlockchainLedger(policyId)

    // Map blockchain entries to the LedgerEntry shape the UI expects
    const entries: LedgerEntry[] = (ledger.entries || []).map((e: any) => ({
      id: e.id,
      beneficiaryId: e.fingerprint ? e.fingerprint.slice(0, 12) + '...' : 'on-chain',
      beneficiaryDisplay: e.assetName || 'Claim Token',
      disasterCode: e.disasterCode || 'Unknown',
      disasterName: e.description || e.disasterCode || 'Unknown',
      aidType: e.aidType || 'Unknown',
      agency: e.agency || 'Unknown',
      claimed: e.quantity > 0,
      claimedAt: e.timestamp,
      createdAt: e.timestamp || new Date().toISOString(),
      txHash: e.mintTxHash,
      fingerprint: e.fingerprint,
      quantity: e.quantity,
    }))

    return {
      entries,
      metrics: {
        totalStubs: ledger.metrics.totalAssets,
        claimedCount: entries.length,
        activeCampaigns: 0, // Not tracked on-chain
      },
      source: 'blockchain',
      policyId,
    }
  } catch (error: any) {
    console.error('Blockchain ledger fetch error:', error.message)
    return {
      entries: [],
      metrics: { totalStubs: 0, claimedCount: 0, activeCampaigns: 0 },
      source: 'unavailable',
    }
  }
}
