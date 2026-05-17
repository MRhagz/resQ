/**
 * =============================================================================
 * MOCK DATA — Centralized data source for the admin dashboard
 * =============================================================================
 *
 * WHY A SEPARATE FILE?
 * --------------------
 * Keeping mock data in its own file is a clean architecture pattern:
 *   1. Components stay focused on UI logic, not data definitions
 *   2. When you later connect to a real database, you only swap this file
 *   3. Multiple components can import from the same source (single source of truth)
 *   4. TypeScript interfaces defined here act as a "contract" for your data shape
 *
 * HOW TO LEARN FROM THIS:
 * -----------------------
 * - Notice how each interface defines the SHAPE of a data object
 * - The `as const` arrays provide fixed option lists for dropdowns
 * - Mock data uses realistic Philippine disaster relief context
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Represents a disaster event in the system.
 * 
 * WHY `export interface`?
 * An interface is a TypeScript-only construct (removed at compile time).
 * It tells other files: "this is the shape of a DisasterEvent object".
 */
export interface DisasterEvent {
  id: string
  system_code: string
  name: string
  status: 'ACTIVE' | 'CLOSED'
  allowed_regions: string[]
  created_at: string
}

/**
 * Represents a beneficiary — a person eligible to receive aid.
 *
 * KEY FIELDS FOR FILTERING:
 * - region: geographic filter (where they live)
 * - is_disaster_affected: whether they're in the disaster zone
 */
export interface Beneficiary {
  id: string
  full_name: string
  region: string
  barangay: string
  is_disaster_affected: boolean
  philsys_hash: string // Hashed national ID — no PII stored
}

// =============================================================================
// CONSTANTS — Used for dropdown options in filter controls
// =============================================================================

/**
 * `as const` makes TypeScript treat these as literal types, not just `string[]`.
 * This means you get autocomplete and type-checking when using these values.
 */
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

/**
 * Represents a claim stub — the associative entity linking
 * a beneficiary to a disaster/aid type. Created by admin (claimed=false),
 * redeemed by worker (claimed=true).
 */
export interface ClaimStub {
  id: string
  beneficiary_id: string       // maps to beneficiary system_uuid
  disaster_event_id: string
  aid_type: string
  agency: string               // auto from staff_profiles.agency
  approved_by: string          // admin who created the stub
  claimed: boolean
  claimed_by: string | null    // worker who distributed
  claimed_at: string | null
  created_at: string
}

/**
 * Mock claim stubs for demo purposes.
 * In production, these come from the claim_stubs Supabase table.
 */
export const MOCK_CLAIM_STUBS: ClaimStub[] = [
  {
    id: 'cs001',
    beneficiary_id: 'b001',
    disaster_event_id: '1',
    aid_type: 'Food Ration',
    agency: 'DSWD',
    approved_by: 'admin-1',
    claimed: true,
    claimed_by: 'worker-1',
    claimed_at: '2026-05-15T11:30:00Z',
    created_at: '2026-05-15T09:00:00Z',
  },
  {
    id: 'cs002',
    beneficiary_id: 'b002',
    disaster_event_id: '1',
    aid_type: 'Medical Kit',
    agency: 'DSWD',
    approved_by: 'admin-1',
    claimed: false,
    claimed_by: null,
    claimed_at: null,
    created_at: '2026-05-16T14:20:00Z',
  },
  {
    id: 'cs003',
    beneficiary_id: 'b005',
    disaster_event_id: '2',
    aid_type: 'Shelter Kit',
    agency: 'Red Cross PH',
    approved_by: 'admin-1',
    claimed: false,
    claimed_by: null,
    claimed_at: null,
    created_at: '2026-05-17T08:45:00Z',
  },
  {
    id: 'cs004',
    beneficiary_id: 'b009',
    disaster_event_id: '4',
    aid_type: 'Food Ration',
    agency: 'DSWD',
    approved_by: 'admin-1',
    claimed: true,
    claimed_by: 'worker-2',
    claimed_at: '2026-05-16T15:00:00Z',
    created_at: '2026-05-16T10:00:00Z',
  },
]

// =============================================================================
// MOCK DATA — Disaster Events
// =============================================================================

export const MOCK_DISASTERS: DisasterEvent[] = [
  {
    id: '1',
    system_code: 'TY-2026-001',
    name: 'Typhoon Aghon',
    status: 'ACTIVE',
    allowed_regions: ['NCR', 'Region IV-A'],
    created_at: '2026-05-10T08:00:00Z',
  },
  {
    id: '2',
    system_code: 'EQ-2026-003',
    name: 'Mindanao Earthquake 6.2',
    status: 'ACTIVE',
    allowed_regions: ['Region XI', 'Region XII'],
    created_at: '2026-04-22T14:30:00Z',
  },
  {
    id: '3',
    system_code: 'FL-2026-007',
    name: 'Cagayan Valley Flooding',
    status: 'CLOSED',
    allowed_regions: ['Region II'],
    created_at: '2026-03-15T06:00:00Z',
  },
  {
    id: '4',
    system_code: 'TY-2026-009',
    name: 'Typhoon Butchoy',
    status: 'ACTIVE',
    allowed_regions: ['Region V', 'Region VIII'],
    created_at: '2026-05-14T10:00:00Z',
  },
]

// =============================================================================
// MOCK DATA — Beneficiaries
// =============================================================================

/**
 * 15 mock beneficiaries with varied attributes for filtering demos.
 * 
 * The `philsys_hash` is a fake SHA-256-like hash to simulate
 * the cryptographic identity system (no real PII).
 */
export const MOCK_BENEFICIARIES: Beneficiary[] = [
  {
    id: 'b001',
    full_name: 'Maria Santos Dela Cruz',
    region: 'NCR',
    barangay: 'Brgy. San Antonio, Makati',
    is_disaster_affected: true,
    philsys_hash: '0xa3f1...7d2e',
  },
  {
    id: 'b002',
    full_name: 'Juan Andres Reyes',
    region: 'NCR',
    barangay: 'Brgy. Bagong Silang, Caloocan',
    is_disaster_affected: true,
    philsys_hash: '0xb7c2...9f1a',
  },
  {
    id: 'b003',
    full_name: 'Rosalinda Manalo Garcia',
    region: 'Region IV-A',
    barangay: 'Brgy. Paliparan, Dasmariñas',
    is_disaster_affected: true,
    philsys_hash: '0xd4e8...3b5c',
  },
  {
    id: 'b004',
    full_name: 'Roberto Fernandez Jr.',
    region: 'Region IV-A',
    barangay: 'Brgy. San Isidro, Antipolo',
    is_disaster_affected: true,
    philsys_hash: '0xe9a1...6c8d',
  },
  {
    id: 'b005',
    full_name: 'Esperanza Villanueva',
    region: 'Region XI',
    barangay: 'Brgy. Buhangin, Davao City',
    is_disaster_affected: true,
    philsys_hash: '0xf2b3...8e4f',
  },
  {
    id: 'b006',
    full_name: 'Antonio Bautista Ramos',
    region: 'Region XI',
    barangay: 'Brgy. Tibungco, Davao City',
    is_disaster_affected: true,
    philsys_hash: '0x1c7d...2a9e',
  },
  {
    id: 'b007',
    full_name: 'Concepcion Aquino Torres',
    region: 'Region XII',
    barangay: 'Brgy. Poblacion, General Santos',
    is_disaster_affected: true,
    philsys_hash: '0x3e5f...4b1c',
  },
  {
    id: 'b008',
    full_name: 'Pedro Enriquez Santiago',
    region: 'Region II',
    barangay: 'Brgy. Centro, Tuguegarao',
    is_disaster_affected: false,
    philsys_hash: '0x5a2b...7d3e',
  },
  {
    id: 'b009',
    full_name: 'Lourdes Mendoza Cruz',
    region: 'Region V',
    barangay: 'Brgy. Daraga, Albay',
    is_disaster_affected: true,
    philsys_hash: '0x8f4c...1e6a',
  },
  {
    id: 'b010',
    full_name: 'Carlos Dimaculangan',
    region: 'Region VIII',
    barangay: 'Brgy. Abucay, Tacloban',
    is_disaster_affected: true,
    philsys_hash: '0xc1d9...5f2b',
  },
  {
    id: 'b011',
    full_name: 'Teresita Gonzales Lim',
    region: 'Region VIII',
    barangay: 'Brgy. San Jose, Ormoc',
    is_disaster_affected: true,
    philsys_hash: '0xd3e7...8a4c',
  },
  {
    id: 'b012',
    full_name: 'Fernando Pascual Reyes',
    region: 'NCR',
    barangay: 'Brgy. Payatas, Quezon City',
    is_disaster_affected: true,
    philsys_hash: '0xe5f1...9c6d',
  },
  {
    id: 'b013',
    full_name: 'Gloria Magtanggol Roque',
    region: 'Region V',
    barangay: 'Brgy. Peñafrancia, Naga',
    is_disaster_affected: false,
    philsys_hash: '0xf7a3...2d8e',
  },
  {
    id: 'b014',
    full_name: 'Ricardo Soriano Pangilinan',
    region: 'Region III',
    barangay: 'Brgy. Sto. Rosario, Angeles',
    is_disaster_affected: false,
    philsys_hash: '0x2b4d...6e1f',
  },
  {
    id: 'b015',
    full_name: 'Amelia Castillo Vega',
    region: 'CAR',
    barangay: 'Brgy. Burnham, Baguio',
    is_disaster_affected: false,
    philsys_hash: '0x4c6e...8f2a',
  },
]
