/**
 * License key parsing, gating, and extension behavior tests
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLicense, checkLicense, resetLicense, generateKey } from '../src/license'
import { Emboss } from '../src/core/index'
import { todayMarker } from '../src/extensions/free/today-marker'
import { sidebar } from '../src/extensions/paid/organize/sidebar'
import { columns } from '../src/extensions/paid/columns/columns'
import type { Row, EmbossExtension } from '../src/core/types'

const baseRows: Row[] = [
  { id: 'p1', type: 'phase', name: 'Design', depth: 0, parentId: null, collapsed: false, hidden: false, start: 0, duration: 20, progress: 75, status: 'active', dependencies: [], children: ['t1'] },
  { id: 't1', type: 'task', name: 'Wireframes', depth: 1, parentId: 'p1', collapsed: false, hidden: false, start: 0, duration: 7, progress: 100, status: 'done', dependencies: [] },
  { id: 't2', type: 'task', name: 'Visual Design', depth: 0, parentId: null, collapsed: false, hidden: false, start: 5, duration: 10, progress: 60, status: 'active', dependencies: [] },
]

function makeChart(config: { extensions?: EmbossExtension[], licenseKey?: string } = {}) {
  const el = document.createElement('div')
  el.id = 'chart'
  document.body.appendChild(el)
  return new Emboss('#chart', JSON.parse(JSON.stringify(baseRows)), {
    view: 'week',
    startDate: new Date(),
    ...config,
  })
}

beforeEach(() => {
  resetLicense()
})

afterEach(() => {
  document.body.innerHTML = ''
  document.querySelectorAll('[data-emboss],[data-emboss-ext]').forEach(el => el.remove())
  resetLicense()
})

// ─── Key parsing tests ──────────────────────────────────────────────────────

describe('Key parsing', () => {
  it('valid key EMB-O-20991231 unlocks organize', () => {
    setLicense(generateKey('O', '20991231'))
    expect(checkLicense('organize')).toBe(true)
  })

  it('valid key EMB-OC-20991231 unlocks organize + columns', () => {
    setLicense(generateKey('OC', '20991231'))
    expect(checkLicense('organize')).toBe(true)
    expect(checkLicense('columns')).toBe(true)
  })

  it('valid key EMB-OCSPA-20991231 unlocks all bundles', () => {
    setLicense(generateKey('OCSPA', '20991231'))
    expect(checkLicense('organize')).toBe(true)
    expect(checkLicense('columns')).toBe(true)
    expect(checkLicense('people')).toBe(true)
    expect(checkLicense('subtasks')).toBe(true)
    expect(checkLicense('analyze')).toBe(true)
  })

  it('invalid format "not-a-key" locks all bundles', () => {
    setLicense('not-a-key')
    expect(checkLicense('organize')).toBe(false)
    expect(checkLicense('columns')).toBe(false)
  })

  it('EMB-O unlocks columns (organize includes columns)', () => {
    setLicense(generateKey('O', '20991231'))
    expect(checkLicense('columns')).toBe(true)
  })

  it('columns without organize — EMB-C does not unlock columns', () => {
    setLicense(generateKey('C', '20991231'))
    expect(checkLicense('columns')).toBe(false)
  })

  it('no license key set returns false and warns', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(checkLicense('organize')).toBe(false)
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy.mock.calls[0][0]).toContain('"organize" bundle requires a license')
    warnSpy.mockRestore()
  })

  it('warns only once per bundle when no key set', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    checkLicense('organize')
    checkLicense('organize')
    checkLicense('organize')
    expect(warnSpy).toHaveBeenCalledOnce()
    warnSpy.mockRestore()
  })

  it('warns once for invalid format', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    setLicense('bad-key')
    checkLicense('organize')
    checkLicense('columns')
    // One format warning total, not per-bundle
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy.mock.calls[0][0]).toContain('Invalid license key format')
    warnSpy.mockRestore()
  })

  it('expired key still returns true but warns', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    setLicense(generateKey('O', '20200101'))
    expect(checkLicense('organize')).toBe(true)
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy.mock.calls[0][0]).toContain('expired')
    warnSpy.mockRestore()
  })

  it('case-insensitive flag matching', () => {
    // generateKey uppercases internally, but we lowercase the flags in the key string
    // to test case-insensitive matching
    const key = generateKey('OC', '20991231')
    const lowerKey = key.replace('EMB-OC-', 'EMB-oc-')
    setLicense(lowerKey)
    expect(checkLicense('organize')).toBe(true)
    expect(checkLicense('columns')).toBe(true)
  })
})

// ─── Extension gating tests ─────────────────────────────────────────────────

describe('Extension gating', () => {
  it('no license key — paid extensions skip, free extensions register', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const chart = makeChart({ extensions: [todayMarker, sidebar] })

    const styles = document.querySelectorAll('[data-emboss-ext]')
    const names = Array.from(styles).map(el => (el as HTMLElement).dataset.embossExt)
    expect(names).toContain('today-marker')
    expect(names).not.toContain('sidebar')

    chart.destroy()
    warnSpy.mockRestore()
  })

  it('valid O key — organize registers, columns also registers', () => {
    const chart = makeChart({
      licenseKey: generateKey('O', '20991231'),
      extensions: [sidebar, columns],
    })

    const styles = document.querySelectorAll('[data-emboss-ext]')
    const names = Array.from(styles).map(el => (el as HTMLElement).dataset.embossExt)
    expect(names).toContain('sidebar')
    expect(names).toContain('columns')

    chart.destroy()
  })

  it('valid OC key — both organize and columns register', () => {
    const chart = makeChart({
      licenseKey: generateKey('OC', '20991231'),
      extensions: [sidebar, columns],
    })

    const styles = document.querySelectorAll('[data-emboss-ext]')
    const names = Array.from(styles).map(el => (el as HTMLElement).dataset.embossExt)
    expect(names).toContain('sidebar')
    expect(names).toContain('columns')

    chart.destroy()
  })

  it('invalid key format — paid extensions skip, warns once', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const chart = makeChart({
      licenseKey: 'not-valid',
      extensions: [todayMarker, sidebar, columns],
    })

    const styles = document.querySelectorAll('[data-emboss-ext]')
    const names = Array.from(styles).map(el => (el as HTMLElement).dataset.embossExt)
    expect(names).toContain('today-marker')
    expect(names).not.toContain('sidebar')
    expect(names).not.toContain('columns')

    // One format warning
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy.mock.calls[0][0]).toContain('Invalid license key format')

    chart.destroy()
    warnSpy.mockRestore()
  })

  it('paid extension init is not called when gated', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let initCalled = false
    const paidExt: EmbossExtension = {
      name: 'test-paid',
      type: 'paid',
      bundle: 'organize',
      init() { initCalled = true },
      styles: '.test-paid { color: red; }',
    }

    const chart = makeChart({ extensions: [paidExt] })
    expect(initCalled).toBe(false)

    chart.destroy()
    warnSpy.mockRestore()
  })

  it('paid extension init IS called when license valid', () => {
    let initCalled = false
    const paidExt: EmbossExtension = {
      name: 'test-paid',
      type: 'paid',
      bundle: 'organize',
      init() { initCalled = true },
    }

    const chart = makeChart({ licenseKey: generateKey('O', '20991231'), extensions: [paidExt] })
    expect(initCalled).toBe(true)

    chart.destroy()
  })
})

// ─── Integration tests ──────────────────────────────────────────────────────

describe('Integration — chart renders correctly under license scenarios', () => {
  it('renders with only free extensions (no license)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const chart = makeChart({ extensions: [todayMarker] })

    // Chart should render bars for visible rows
    const bars = document.querySelectorAll('.emboss-bar')
    expect(bars.length).toBeGreaterThan(0)

    // Header and grid should exist
    expect(document.querySelector('.emboss-header')).toBeTruthy()
    expect(document.querySelector('.emboss-grid')).toBeTruthy()

    chart.destroy()
    warnSpy.mockRestore()
  })

  it('renders with organize extension (valid O key)', () => {
    const chart = makeChart({
      licenseKey: generateKey('O', '20991231'),
      extensions: [todayMarker, sidebar],
    })

    // Sidebar should be registered (style injected)
    const sidebarStyle = document.querySelector('[data-emboss-ext="sidebar"]')
    expect(sidebarStyle).toBeTruthy()

    // Chart still renders bars
    const bars = document.querySelectorAll('.emboss-bar')
    expect(bars.length).toBeGreaterThan(0)

    chart.destroy()
  })

  it('renders with organize + columns (valid OC key)', () => {
    const chart = makeChart({
      licenseKey: generateKey('OC', '20991231'),
      extensions: [todayMarker, sidebar, columns],
    })

    const styles = document.querySelectorAll('[data-emboss-ext]')
    const names = Array.from(styles).map(el => (el as HTMLElement).dataset.embossExt)
    expect(names).toContain('today-marker')
    expect(names).toContain('sidebar')
    expect(names).toContain('columns')

    chart.destroy()
  })

  it('use() at runtime respects license gating', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const chart = makeChart({ licenseKey: generateKey('O', '20991231') })

    // Runtime use — columns should work (O flag unlocks columns)
    chart.use(columns)
    const colStyle = document.querySelector('[data-emboss-ext="columns"]')
    expect(colStyle).toBeTruthy()

    // Sidebar should work fine (O flag present)
    chart.use(sidebar)
    const sidebarStyle = document.querySelector('[data-emboss-ext="sidebar"]')
    expect(sidebarStyle).toBeTruthy()

    chart.destroy()
    warnSpy.mockRestore()
  })
})

// ─── Checksum validation tests ─────────────────────────────────────────────

describe('Checksum validation', () => {
  it('valid checksum passes', () => {
    setLicense(generateKey('O', '20991231'))
    expect(checkLicense('organize')).toBe(true)
  })

  it('tampered checksum (correct format, wrong hex) fails and warns once', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    setLicense('EMB-O-20991231-00000000')
    expect(checkLicense('organize')).toBe(false)
    expect(checkLicense('organize')).toBe(false)
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy.mock.calls[0][0]).toContain('Invalid license key checksum')
    warnSpy.mockRestore()
  })

  it('tampered flags (changed O→OC but kept old checksum) fails', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // Generate a valid O key, then swap flags to OC without updating checksum
    const validKey = generateKey('O', '20991231')
    const checksum = validKey.split('-').pop()
    setLicense(`EMB-OC-20991231-${checksum}`)
    expect(checkLicense('organize')).toBe(false)
    warnSpy.mockRestore()
  })

  it('generateKey() produces keys that checkLicense() accepts', () => {
    const keys = [
      generateKey('O', '20991231'),
      generateKey('OC', '20991231'),
      generateKey('OCSPA', '20991231'),
    ]
    for (const key of keys) {
      resetLicense()
      setLicense(key)
      expect(checkLicense('organize')).toBe(true)
    }
  })
})
