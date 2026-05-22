/**
 * Types and constants for the admin dashboard.
 * All data is fetched from Supabase — no mock arrays.
 */

// TYPE DEFINITIONS

export interface DisasterEvent {
  id: string
  system_code: string
  name: string
  status: 'ACTIVE' | 'CLOSED'
  allowed_regions: string[]
  starts_at: string | null
  ends_at: string | null
  created_at: string
}


export interface Beneficiary {
  id: string
  full_name: string
  region: string
  barangay: string
  is_disaster_affected: boolean
  registration_source?: string
  philsys_hash: string
  created_at?: string
}

export interface ClaimStub {
  id: string
  beneficiary_id: string
  disaster_event_id: string
  aid_type: string
  agency: string
  approved_by: string
  claimed: boolean
  claimed_by: string | null
  claimed_at: string | null
  created_at: string
}

// CONSTANTS — dropdown options

export const REGIONS = [
  'NCR',
  'Region I',
  'Region II',
  'Region III',
  'Region IV-A',
  'Region V',
  'Region VI',
  'Region VII',
  'Region VIII',
  'Region IX',
  'Region X',
  'Region XI',
  'Region XII',
  'CAR',
  'BARMM',
] as const

export const AID_TYPES = [
  'Food Ration',
  'Medical Kit',
  'Shelter Kit',
  'Hygiene Pack',
  'Cash Assistance',
] as const
