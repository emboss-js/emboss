/**
 * Phase 4 — Extension composition tests
 * Mirrors demo/test-extensions.html assertions in vitest + jsdom.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Emboss } from '../src/core/index'
import { todayMarker } from '../src/extensions/free/today-marker'
import { tooltips } from '../src/extensions/free/tooltips'
import { dependencyArrows } from '../src/extensions/free/dependency-arrows'
import type { Row, EmbossExtension, Scale, EmbossState } from '../src/core/types'

const baseRows: Row[] = [
  { id: 'p1', type: 'phase', name: 'Design', depth: 0, parentId: null, collapsed: false, hidden: false, start: 0, duration: 20, progress: 75, status: 'active', dependencies: [], children: ['t1', 't2'] },
  { id: 't1', type: 'task', name: 'Wireframes', depth: 1, parentId: 'p1', collapsed: false, hidden: false, start: 0, duration: 7, progress: 100, status: 'done', dependencies: [] },
  { id: 't2', type: 'task', name: 'Visual Design', depth: 1, parentId: 'p1', collapsed: false, hidden: false, start: 5, duration: 10, progress: 60, status: 'active', dependencies: ['t1'] },
  { id: 't3', type: 'task', name: 'API Integration', depth: 0, parentId: null, collapsed: false, hidden: false, start: 12, duration: 12, progress: 0, status: 'upcoming', dependencies: ['t2'] },
  { id: 's1', type: 'subtask', name: 'Auth Module', depth: 1, parentId: 't3', collapsed: false, hidden: false, start: 14, duration: 4, progress: 0, status: 'upcoming', dependencies: [] },
]

function makeChart(extensions: EmbossExtension[] = []) {
  const el = document.createElement('div')
  el.id = 'chart'
  document.body.appendChild(el)
  return new Emboss('#chart', JSON.parse(JSON.stringify(baseRows)), {
    view: 'week',
    startDate: new Date(),
    extensions,
  })
}

afterEach(() => {
  // Clean up all chart containers and injected styles
  document.body.innerHTML = ''
  document.querySelectorAll('[data-emboss],[data-emboss-ext]').forEach(el => el.remove())
})

// ─── TEST 1: Registration order ────────────────────────────────────────────

describe('1. Registration order — later overrides earlier', () => {
  it('later barRenderer override wins for same row type', () => {
    const extA: EmbossExtension = {
      name: 'test-bar-a',
      type: 'free',
      barRenderer: {
        subtask: (row, scale) => {
          const el = document.createElement('div')
          el.className = 'emboss-bar'
          el.dataset.id = row.id
          el.dataset.renderer = 'A'
          el.style.cssText = `position:absolute;left:0;width:50px;height:20px;`
          return el
        },
      },
    }
    const extB: EmbossExtension = {
      name: 'test-bar-b',
      type: 'free',
      barRenderer: {
        subtask: (row, scale) => {
          const el = document.createElement('div')
          el.className = 'emboss-bar'
          el.dataset.id = row.id
          el.dataset.renderer = 'B'
          el.style.cssText = `position:absolute;left:0;width:50px;height:20px;`
          return el
        },
      },
    }

    const chart = makeChart([extA, extB])
    const bar = document.querySelector('.emboss-bar[data-id="s1"]')
    expect(bar).toBeTruthy()
    expect(bar!.getAttribute('data-renderer')).toBe('B')
    chart.destroy()
  })
})

// ─── TEST 2: enrichRows pipeline ───────────────────────────────────────────

describe('2. enrichRows pipeline — multiple extensions enrich same rows', () => {
  it('chains multiple enrichRows in registration order', () => {
    const enrichA: EmbossExtension = {
      name: 'enrich-a',
      type: 'free',
      enrichRows: (rows) =>
        rows.map(r => ({ ...r, phaseName: r.parentId === 'p1' ? 'Design' : r.phaseName })),
    }
    const enrichB: EmbossExtension = {
      name: 'enrich-b',
      type: 'free',
      enrichRows: (rows) =>
        rows.map(r => ({ ...r, assignee: r.type === 'task' ? 'Test User' : r.assignee })),
    }

    const chart = makeChart([enrichA, enrichB])
    // Original rows in state should not be mutated
    const original = chart.state.rows.find(r => r.id === 't1')
    expect(original!.assignee).toBeUndefined()
    chart.destroy()
  })

  it('runtime-added enrichRows runs on next render', () => {
    const chart = makeChart()
    let enrichCRan = false
    chart.use({
      name: 'enrich-c',
      type: 'free',
      enrichRows: (rows) => { enrichCRan = true; return rows },
    })
    chart.render()
    expect(enrichCRan).toBe(true)
    chart.destroy()
  })
})

// ─── TEST 3: Renderer isolation ────────────────────────────────────────────

describe('3. Renderers from different extensions don\'t conflict', () => {
  it('custom headerRenderer + custom barRenderer coexist with core defaults', () => {
    let headerCalled = false
    const customHeader: EmbossExtension = {
      name: 'custom-header',
      type: 'free',
      headerRenderer: (scale, state) => {
        headerCalled = true
        const el = document.createElement('div')
        el.className = 'emboss-header-content'
        el.textContent = 'Custom Header'
        return el
      },
    }
    const customSubtask: EmbossExtension = {
      name: 'custom-subtask',
      type: 'free',
      barRenderer: {
        subtask: (row, scale) => {
          const el = document.createElement('div')
          el.className = 'emboss-bar'
          el.dataset.id = row.id
          el.dataset.custom = 'true'
          el.style.cssText = `position:absolute;left:0;width:50px;height:20px;`
          return el
        },
      },
    }

    const chart = makeChart([customHeader, customSubtask])
    expect(headerCalled).toBe(true)

    const subtaskBar = document.querySelector('.emboss-bar[data-id="s1"]')
    const taskBar = document.querySelector('.emboss-bar[data-id="t1"]')
    expect(subtaskBar!.getAttribute('data-custom')).toBe('true')
    expect(taskBar!.getAttribute('data-custom')).toBeNull()
    chart.destroy()
  })
})

// ─── TEST 4: Multiple event handlers ───────────────────────────────────────

describe('4. Event handlers from multiple extensions all fire', () => {
  it('all extension handlers and user listeners fire on setView', () => {
    let handlerAFired = false
    let handlerBFired = false
    let listenerFired = false

    const extA: EmbossExtension = {
      name: 'handler-a',
      type: 'free',
      handlers: { onViewChange: () => { handlerAFired = true } },
    }
    const extB: EmbossExtension = {
      name: 'handler-b',
      type: 'free',
      handlers: { onViewChange: () => { handlerBFired = true } },
    }

    const chart = makeChart([extA, extB])
    chart.on('onViewChange', () => { listenerFired = true })
    chart.setView('month')

    expect(handlerAFired).toBe(true)
    expect(handlerBFired).toBe(true)
    expect(listenerFired).toBe(true)
    chart.destroy()
  })

  it('handler returning false short-circuits propagation and blocks update', () => {
    let afterBlockerFired = false
    let listenerFired = false

    const blocker: EmbossExtension = {
      name: 'blocker',
      type: 'free',
      handlers: { onRowUpdate: () => false },
    }
    const afterBlocker: EmbossExtension = {
      name: 'after-blocker',
      type: 'free',
      handlers: { onRowUpdate: () => { afterBlockerFired = true } },
    }

    const chart = makeChart([blocker, afterBlocker])
    chart.on('onRowUpdate', () => { listenerFired = true })

    const before = chart.state.rows.find(r => r.id === 't2')!.progress
    chart.updateRow('t2', { progress: 99 })
    const after = chart.state.rows.find(r => r.id === 't2')!.progress

    expect(before).toBe(after)
    expect(afterBlockerFired).toBe(false)
    expect(listenerFired).toBe(false)
    chart.destroy()
  })
})

// ─── TEST 5: Full composition — register 3, remove 1, add custom ──────────

describe('5. Full composition — register 3, remove 1, add custom', () => {
  it('all three free extensions register, styles inject, and render', () => {
    const chart = makeChart([todayMarker, tooltips, dependencyArrows])

    const styles = document.querySelectorAll('[data-emboss-ext]')
    const names = Array.from(styles).map(el => (el as HTMLElement).dataset.embossExt)
    expect(styles.length).toBe(3)
    expect(names).toContain('today-marker')
    expect(names).toContain('tooltips')
    expect(names).toContain('dependency-arrows')

    chart.destroy()
  })

  it('removing an extension removes its styles, others still work', () => {
    const chart = makeChart([todayMarker, tooltips, dependencyArrows])

    chart.remove('tooltips')

    const styles = document.querySelectorAll('[data-emboss-ext]')
    const names = Array.from(styles).map(el => (el as HTMLElement).dataset.embossExt)
    expect(names).not.toContain('tooltips')
    expect(styles.length).toBe(2)
    expect(names).toContain('today-marker')
    expect(names).toContain('dependency-arrows')

    chart.destroy()
  })

  it('adding a custom extension at runtime composes correctly', () => {
    const chart = makeChart([todayMarker, dependencyArrows])

    let customInitRan = false
    let customAfterRenderFired = false

    const custom: EmbossExtension = {
      name: 'status-badge',
      type: 'free',
      enrichRows: (rows) => rows.map(r => ({
        ...r,
        phaseName: r.parentId === 'p1' ? 'Design' : r.phaseName,
      })),
      init(emboss) {
        customInitRan = true
        emboss.on('afterRender', () => { customAfterRenderFired = true })
      },
      styles: `.status-badge { color: red; }`,
    }

    chart.use(custom)
    chart.render()

    expect(customInitRan).toBe(true)
    expect(customAfterRenderFired).toBe(true)

    const customStyle = document.querySelector('[data-emboss-ext="status-badge"]')
    expect(customStyle).toBeTruthy()

    // Final count: 3 extensions (today-marker, dep-arrows, status-badge)
    const allStyles = document.querySelectorAll('[data-emboss-ext]')
    expect(allStyles.length).toBe(3)

    chart.destroy()
  })
})
