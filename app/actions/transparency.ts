'use server'

import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'

/**
 * BENEFICIARY TOKEN LOOKUP — Public transparency feature.
 *
 * Allows beneficiaries to look up their claim history by providing
 * their PhilSys Number (hashed on-server for privacy).
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

  // Strategy 1: Hash the ID the same way registration does
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

  // Strategy 2: Raw id_hash lookup (seeded/test data)
  const { data: rawMatch } = await supabase
    .from('beneficiaries')
    .select('system_uuid, general_demographics, created_at')
    .eq('id_hash', trimmedId)
    .single()

  if (rawMatch) return await fetchTokenHistory(supabase, rawMatch)

  // Strategy 3: Lookup by system_uuid
  const { data: uuidMatch } = await supabase
    .from('beneficiaries')
    .select('system_uuid, general_demographics, created_at')
    .eq('system_uuid', trimmedId)
    .single()

  if (uuidMatch) return await fetchTokenHistory(supabase, uuidMatch)

  // Strategy 4: Partial id_hash match
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

  const { data: stubs, error: stubError } = await supabase
    .from('claim_stubs')
    .select('id, disaster_event_id, aid_type, agency, claimed, claimed_at, created_at')
    .eq('beneficiary_uuid', beneficiary.system_uuid)
    .order('created_at', { ascending: false })

  if (stubError) {
    console.error('Fetch stubs error:', stubError)
    return { status: 'error', message: 'Failed to fetch token history.' }
  }

  const disasterIds = [...new Set((stubs ?? []).map((s: any) => s.disaster_event_id))]
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

  const tokens = (stubs ?? []).map((s: any) => {
    const disaster = disasterMap[s.disaster_event_id] ?? { name: 'Unknown', system_code: '???' }
    return {
      id: s.id,
      disasterName: disaster.name,
      disasterCode: disaster.system_code,
      aidType: s.aid_type,
      agency: s.agency,
      claimed: s.claimed,
      claimedAt: s.claimed_at,
      createdAt: s.created_at,
    }
  })

  return {
    status: 'success',
    message: `Found ${tokens.length} token(s) for this beneficiary.`,
    beneficiary: {
      systemId: beneficiary.system_uuid,
      registeredAt: beneficiary.created_at,
      region: (demo.region as string) ?? 'Unknown',
    },
    tokens,
  }
}

// =============================================================================
// PUBLIC LEDGER — Fetches from the Cardano blockchain via Blockfrost
// =============================================================================

export interface LedgerEntry {
  id: string
  tokenName: string
  assetFingerprint: string
  disasterCode: string
  aidType: string
  agency: string
  region: string
  mintTxHash: string
  mintedAt: string
  quantity: number
}

export interface LedgerData {
  entries: LedgerEntry[]
  metrics: {
    totalAssets: number
    policyId: string
  }
  network: string
  explorerUrl: string
  source: 'blockchain' | 'unavailable'
}

export async function fetchPublicLedger(): Promise<LedgerData> {
  const BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY
  const policyId = process.env.SYSTEM_POLICY_ID

  if (!BLOCKFROST_KEY || !policyId) {
    console.warn(
      !BLOCKFROST_KEY
        ? 'BLOCKFROST_API_KEY not set'
        : 'SYSTEM_POLICY_ID not set',
      '— blockchain ledger unavailable'
    )
    return {
      entries: [],
      metrics: { totalAssets: 0, policyId: policyId || 'N/A' },
      network: 'Unknown',
      explorerUrl: '',
      source: 'unavailable',
    }
  }

  try {
    const { fetchBlockchainLedger, getNetworkName, getExplorerBaseUrl } =
      await import('@/lib/blockchain/fetchLedger.js')

    const ledger = await fetchBlockchainLedger(policyId)

    const entries: LedgerEntry[] = (ledger.entries || []).map((e: any) => ({
      id: e.id,
      tokenName: e.tokenName || e.assetName || 'Claim Token',
      assetFingerprint: e.fingerprint || '',
      disasterCode: e.disasterCode,
      aidType: e.aidType,
      agency: e.agency,
      region: e.region,
      mintTxHash: e.mintTxHash,
      mintedAt: e.timestamp || new Date().toISOString(),
      quantity: e.quantity,
    }))

    return {
      entries,
      metrics: {
        totalAssets: ledger.metrics.totalAssets,
        policyId,
      },
      network: getNetworkName(),
      explorerUrl: getExplorerBaseUrl(),
      source: 'blockchain',
    }
  } catch (error: any) {
    console.error('Blockchain ledger fetch error:', error.message)
    return {
      entries: [],
      metrics: { totalAssets: 0, policyId },
      network: 'Unknown',
      explorerUrl: '',
      source: 'unavailable',
    }
  }
}
