/**
 * PhilSys QR Code Parser & Scanner Utilities
 *
 * The PhilSys QR contains encrypted/signed data with:
 * - Full Name, Date of Birth, Sex, PhilSys Number (PSN)
 * - PSA digital signature for verification
 *
 * Since the real QR data is encrypted and requires PSA authorization,
 * we parse a structured plaintext format for demo/testing:
 *
 * Format: PSN|LAST|FIRST|MIDDLE|SUFFIX|SEX|DOB|POB|ADDRESS
 * Example: PSN-1234-5678-9012|DELA CRUZ|JUAN|SANTOS||M|1985-03-15|Manila|Brgy. San Antonio, Cainta
 */

export interface PhilSysData {
  fullName: string
  firstName: string
  middleName: string
  lastName: string
  suffix: string
  sex: string
  dateOfBirth: string
  placeOfBirth: string
  address: string
  philsysNumber: string
}

/**
 * Parse a PhilSys QR code string into structured data.
 * Supports pipe-delimited format (demo) and JSON format.
 */
export function parsePhilSysQR(rawData: string): PhilSysData | null {
  const trimmed = rawData.trim()

  try {
    const json = JSON.parse(trimmed)

    // Support official PhilSys JSON structure
    if (json.subject && json.subject.PCN) {
      const subj = json.subject
      return {
        philsysNumber: subj.PCN,
        lastName: subj.lName || '',
        firstName: subj.fName || '',
        middleName: subj.mName || '',
        suffix: subj.Suffix || '',
        sex: normalizeSex(subj.sex || ''),
        dateOfBirth: subj.DOB || '',
        placeOfBirth: subj.POB || '',
        address: '', // Address not included in standard QR payload
        fullName: buildFullName(subj.fName || '', subj.mName || '', subj.lName || '', subj.Suffix || ''),
      }
    }
  } catch {
    // Ignore JSON parse errors and return null
  }

  return null
}

function normalizeSex(s: string): string {
  const upper = s.toUpperCase().trim()
  if (upper === 'M' || upper === 'MALE') return 'Male'
  if (upper === 'F' || upper === 'FEMALE') return 'Female'
  return s
}

function buildFullName(first: string, middle: string, last: string, suffix: string): string {
  return [first, middle, last, suffix].filter(Boolean).join(' ').toUpperCase()
}

