/**
 * @emboss-js/core — license.ts
 * CONTRACT: Spec Section 3.3 (license enforcement)
 *
 * Soft enforcement only. Console warning if paid features used without key.
 * NEVER breaks functionality. NEVER phones home. NEVER validates server-side.
 * Per-project license. Trust buyers to be honest.
 */

let licenseKey: string | null = null
const warned = new Set<string>()

const KEY_RE = /^EMB-([A-Z]+)-(\d{8})-([a-f0-9]+)$/i

const BUNDLE_FLAGS: Record<string, string> = {
  organize: 'O',
  columns: 'C',
  people: 'P',
  subtasks: 'S',
  analyze: 'A',
}

const SALT = 'emboss-2026'

function crc32(str: string): string {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i)
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, '0')
}

function computeChecksum(flags: string, expiry: string): string {
  return crc32(SALT + '-' + flags.toUpperCase() + '-' + expiry)
}

export function generateKey(flags: string, expiry: string): string {
  const upper = flags.toUpperCase()
  const checksum = computeChecksum(upper, expiry)
  return `EMB-${upper}-${expiry}-${checksum}`
}

export function setLicense(key: string): void {
  licenseKey = key
}

export function getLicense(): string | null {
  return licenseKey
}

export function resetLicense(): void {
  licenseKey = null
  warned.clear()
}

export function checkLicense(bundle: string): boolean {
  if (!licenseKey) {
    if (!warned.has(bundle)) {
      warned.add(bundle)
      console.warn(
        `[Emboss] The "${bundle}" bundle requires a license. ` +
        `Get one at https://emboss.dev/pricing — your chart will work fine without it, ` +
        `but please support the project.`
      )
    }
    return false
  }

  const match = KEY_RE.exec(licenseKey)
  if (!match) {
    if (!warned.has('format')) {
      warned.add('format')
      console.warn(
        `[Emboss] Invalid license key format. Expected EMB-{FLAGS}-{YYYYMMDD}-{checksum}.`
      )
    }
    return false
  }

  const [, flags, expiry] = match
  const upperFlags = flags.toUpperCase()

  const expectedChecksum = computeChecksum(upperFlags, expiry)
  if (match[3].toLowerCase() !== expectedChecksum) {
    if (!warned.has('checksum')) {
      warned.add('checksum')
      console.warn('[Emboss] Invalid license key checksum.')
    }
    return false
  }

  const flag = BUNDLE_FLAGS[bundle]

  if (!flag) return false // unknown bundle

  // Check if the bundle's flag is present
  if (!upperFlags.includes(flag)) return false

  // Columns requires organize
  if (bundle === 'columns' && !upperFlags.includes('O')) return false

  // Soft expiry check — warn but still return true
  const expiryDate = parseExpiry(expiry)
  if (expiryDate && expiryDate < new Date()) {
    if (!warned.has('expired')) {
      warned.add('expired')
      console.warn(
        `[Emboss] Your license key expired on ${expiry.slice(0, 4)}-${expiry.slice(4, 6)}-${expiry.slice(6, 8)}. ` +
        `Please renew at https://emboss.dev/pricing`
      )
    }
  }

  return true
}

function parseExpiry(yyyymmdd: string): Date | null {
  const y = parseInt(yyyymmdd.slice(0, 4), 10)
  const m = parseInt(yyyymmdd.slice(4, 6), 10) - 1
  const d = parseInt(yyyymmdd.slice(6, 8), 10)
  const date = new Date(y, m, d)
  if (isNaN(date.getTime())) return null
  return date
}
