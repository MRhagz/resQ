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

  // Try JSON format first
  try {
    const json = JSON.parse(trimmed)
    if (json.psn || json.philsysNumber) {
      return {
        philsysNumber: json.psn || json.philsysNumber || '',
        lastName: json.lastName || json.ln || '',
        firstName: json.firstName || json.fn || '',
        middleName: json.middleName || json.mn || '',
        suffix: json.suffix || json.sfx || '',
        sex: normalizeSex(json.sex || json.s || ''),
        dateOfBirth: json.dateOfBirth || json.dob || '',
        placeOfBirth: json.placeOfBirth || json.pob || '',
        address: json.address || json.addr || '',
        fullName: buildFullName(json.firstName || json.fn || '', json.middleName || json.mn || '', json.lastName || json.ln || '', json.suffix || json.sfx || ''),
      }
    }
  } catch {
    // Not JSON, try pipe format
  }

  // Pipe-delimited: PSN|LAST|FIRST|MIDDLE|SUFFIX|SEX|DOB|POB|ADDRESS
  const parts = trimmed.split('|')
  if (parts.length >= 6 && parts[0].startsWith('PSN')) {
    const [psn, last, first, middle = '', suffix = '', sex = '', dob = '', pob = '', address = ''] = parts
    return {
      philsysNumber: psn,
      lastName: last,
      firstName: first,
      middleName: middle,
      suffix,
      sex: normalizeSex(sex),
      dateOfBirth: dob,
      placeOfBirth: pob,
      address,
      fullName: buildFullName(first, middle, last, suffix),
    }
  }

  // If it starts with PSN but no pipes, treat entire string as the ID
  if (trimmed.startsWith('PSN')) {
    return {
      philsysNumber: trimmed,
      lastName: '',
      firstName: '',
      middleName: '',
      suffix: '',
      sex: '',
      dateOfBirth: '',
      placeOfBirth: '',
      address: '',
      fullName: 'Unknown (ID only scan)',
    }
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

/**
 * Continuously scan for QR codes from a video element using BarcodeDetector API.
 * Falls back gracefully if BarcodeDetector is not supported.
 */
export async function scanQRFromVideo(
  video: HTMLVideoElement,
  onDetected: (data: string) => void,
  signal: AbortSignal
): Promise<void> {
  // Check if BarcodeDetector API is available
  if (!('BarcodeDetector' in window)) {
    console.warn('BarcodeDetector API not available in this browser')
    return
  }

  const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const scan = async () => {
    if (signal.aborted) return
    if (video.readyState < video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(scan)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      const barcodes = await detector.detect(canvas)
      if (barcodes.length > 0) {
        onDetected(barcodes[0].rawValue)
        return // Stop scanning after detection
      }
    } catch {
      // Detection failed, continue
    }

    if (!signal.aborted) {
      requestAnimationFrame(scan)
    }
  }

  requestAnimationFrame(scan)
}
