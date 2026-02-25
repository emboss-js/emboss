/**
 * License key parsing, gating, and extension behavior tests
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLicense, checkLicense, resetLicense } from '../src/license'
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
  it('valid key EMB-O-20991231-a8f3 unlocks organize', () => {
    setLicense('EMB-O-20991231-a8f3')
    expect(checkLicense('organize')).toBe(true)
  })

  it('valid key EMB-OC-20991231-b2e1 unlocks organize + columns', () => {
    setLicense('EMB-OC-20991231-b2e1')
    expect(checkLicense('organize')).toBe(true)
    expect(checkLicense('columns')).toBe(true)
  })

  it('valid key EMB-OCSPA-20991231-f4d7 unlocks all bundles', () => {
    setLicense('EMB-OCSPA-20991231-f4d7')
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

  it('missing flag — EMB-O-20991231-a8f3 does not unlock columns (no C)', () => {
    setLicense('EMB-O-20991231-a8f3')
    expect(checkLicense('columns')).toBe(false)
  })

  it('columns without organize — EMB-C-20991231-a8f3 does not unlock columns', () => {
    setLicense('EMB-C-20991231-a8f3')
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
    setLicense('EMB-O-20200101-a8f3')
    expect(checkLicense('organize')).toBe(true)
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy.mock.calls[0][0]).toContain('expired')
    warnSpy.mockRestore()
  })

  it('case-insensitive flag matching', () => {
    setLicense('EMB-oc-20991231-a8f3')
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

  it('valid O key — organize registers, columns skips', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const chart = makeChart({
      licenseKey: 'EMB-O-20991231-a8f3',
      extensions: [sidebar, columns],
    })

    const styles = document.querySelectorAll('[data-emboss-ext]')
    const names = Array.from(styles).map(el => (el as HTMLElement).dataset.embossExt)
    expect(names).toContain('sidebar')
    expect(names).not.toContain('columns')

    chart.destroy()
    warnSpy.mockRestore()
  })

  it('valid OC key — both organize and columns register', () => {
    const chart = makeChart({
      licenseKey: 'EMB-OC-20991231-b2e1',
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

    const chart = makeChart({ licenseKey: 'EMB-O-20991231-a8f3', extensions: [paidExt] })
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
      licenseKey: 'EMB-O-20991231-a8f3',
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
      licenseKey: 'EMB-OC-20991231-b2e1',
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
    const chart = makeChart({ licenseKey: 'EMB-O-20991231-a8f3' })

    // Runtime use — columns should be gated (no C flag)
    chart.use(columns)
    const colStyle = document.querySelector('[data-emboss-ext="columns"]')
    expect(colStyle).toBeNull()

    // Sidebar should work fine (O flag present)
    chart.use(sidebar)
    const sidebarStyle = document.querySelector('[data-emboss-ext="sidebar"]')
    expect(sidebarStyle).toBeTruthy()

    chart.destroy()
    warnSpy.mockRestore()
  })
})
