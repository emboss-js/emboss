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

export function setLicense(key: string): void {
  licenseKey = key
}

export function checkLicense(bundle: string): boolean {
  if (licenseKey) return true // TODO: basic key format validation
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
