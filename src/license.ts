/**
 * @emboss/core — license.ts
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
