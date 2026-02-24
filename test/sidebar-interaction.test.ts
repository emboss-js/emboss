/**
 * Sidebar interaction tests — "+", color picker, inline edit, delete.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, afterEach } from 'vitest'
import { Emboss } from '../src/core/index'
import { sidebar } from '../src/extensions/paid/organize/sidebar'
import { milestones } from '../src/extensions/paid/organize/milestones'
import type { Row, EmbossExtension } from '../src/core/types'

const baseRows: Row[] = [
  { id: 'p1', type: 'phase', name: 'Design', depth: 0, parentId: null, collapsed: false, hidden: false, start: 0, duration: 20, progress: 75, status: 'active', dependencies: [], phaseColor: '#6366f1', children: ['t1', 't2', 'm1'] },
  { id: 't1', type: 'task', name: 'Wireframes', depth: 1, parentId: 'p1', collapsed: false, hidden: false, start: 0, duration: 7, progress: 100, status: 'done', dependencies: [] },
  { id: 't2', type: 'task', name: 'Visual Design', depth: 1, parentId: 'p1', collapsed: false, hidden: false, start: 5, duration: 10, progress: 60, status: 'active', dependencies: ['t1'] },
  { id: 'm1', type: 'milestone', name: 'Review', depth: 1, parentId: 'p1', collapsed: false, hidden: false, start: 19, duration: 0, progress: 0, status: 'upcoming', dependencies: [] },
  { id: 'p2', type: 'phase', name: 'Dev', depth: 0, parentId: null, collapsed: false, hidden: false, start: 15, duration: 30, progress: 10, status: 'active', dependencies: [], phaseColor: '#8b5cf6', children: ['t3'] },
  { id: 't3', type: 'task', name: 'Frontend', depth: 1, parentId: 'p2', collapsed: false, hidden: false, start: 15, duration: 5, progress: 80, status: 'active', dependencies: [] },
]

function makeChart(extensions: EmbossExtension[] = [sidebar, milestones]) {
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
  document.body.innerHTML = ''
  document.querySelectorAll('[data-emboss],[data-emboss-ext]').forEach(el => el.remove())
})

// ─── "+" button ──────────────────────────────────────────────────────────

describe('"+" button in sidebar header', () => {
  it('renders the "+" button', () => {
    const chart = makeChart()
    const btn = document.querySelector('.emboss-sidebar-add-btn')
    expect(btn).toBeTruthy()
    expect(btn!.textContent).toBe('+')
    chart.destroy()
  })

  it('clicking "+" opens add menu on document.body', () => {
    const chart = makeChart()
    const btn = document.querySelector('.emboss-sidebar-add-btn') as HTMLElement
    btn.click()
    const menu = document.querySelector('.emboss-add-menu')
    expect(menu).toBeTruthy()
    expect(document.body.contains(menu)).toBe(true)
    const items = menu!.querySelectorAll('.emboss-add-menu-item')
    expect(items.length).toBe(3)
    expect(items[0].textContent).toBe('Add Phase')
    expect(items[1].textContent).toBe('Add Task')
    expect(items[2].textContent).toBe('Add Milestone')
    chart.destroy()
  })

  it('clicking "+" again closes the menu', () => {
    const chart = makeChart()
    const btn = document.querySelector('.emboss-sidebar-add-btn') as HTMLElement
    btn.click()
    expect(document.querySelector('.emboss-add-menu')).toBeTruthy()
    btn.click()
    expect(document.querySelector('.emboss-add-menu')).toBeFalsy()
    chart.destroy()
  })

  it('"Add Task" creates a new task row', () => {
    const chart = makeChart()
    const before = chart.state.rows.length
    const existingIds = chart.state.rows.map(r => r.id)
    const btn = document.querySelector('.emboss-sidebar-add-btn') as HTMLElement
    btn.click()
    ;(document.querySelectorAll('.emboss-add-menu-item')[1] as HTMLElement).click()
    expect(chart.state.rows.length).toBe(before + 1)
    const newRow = chart.state.rows.find(r => !existingIds.includes(r.id))
    expect(newRow!.type).toBe('task')
    chart.destroy()
  })

  it('"Add Phase" creates a new phase row', () => {
    const chart = makeChart()
    const before = chart.state.rows.length
    const btn = document.querySelector('.emboss-sidebar-add-btn') as HTMLElement
    btn.click()
    ;(document.querySelectorAll('.emboss-add-menu-item')[0] as HTMLElement).click()
    expect(chart.state.rows.length).toBe(before + 1)
    const last = chart.state.rows[chart.state.rows.length - 1]
    expect(last.type).toBe('phase')
    chart.destroy()
  })

  it('"Add Milestone" creates a new milestone row', () => {
    const chart = makeChart()
    const before = chart.state.rows.length
    const existingIds = chart.state.rows.map(r => r.id)
    const btn = document.querySelector('.emboss-sidebar-add-btn') as HTMLElement
    btn.click()
    ;(document.querySelectorAll('.emboss-add-menu-item')[2] as HTMLElement).click()
    expect(chart.state.rows.length).toBe(before + 1)
    const newRow = chart.state.rows.find(r => !existingIds.includes(r.id))
    expect(newRow!.type).toBe('milestone')
    chart.destroy()
  })
})

// ─── Color picker ────────────────────────────────────────────────────────

describe('Color picker on phase pills', () => {
  it('clicking phase pill opens color picker', () => {
    const chart = makeChart()
    const pill = document.querySelector('.emboss-sidebar-pill') as HTMLElement
    pill.click()
    const picker = document.querySelector('.emboss-color-picker')
    expect(picker).toBeTruthy()
    expect(document.body.contains(picker)).toBe(true)
    expect(picker!.querySelectorAll('.emboss-color-swatch').length).toBe(8)
    chart.destroy()
  })

  it('clicking swatch changes phase color', () => {
    const chart = makeChart()
    ;(document.querySelector('.emboss-sidebar-pill') as HTMLElement).click()
    ;(document.querySelector('.emboss-color-swatch[data-color="#ef4444"]') as HTMLElement).click()
    expect(chart.state.rows.find(r => r.id === 'p1')!.phaseColor).toBe('#ef4444')
    expect(document.querySelector('.emboss-color-picker')).toBeFalsy()
    chart.destroy()
  })

  it('task dots do NOT open color picker', () => {
    const chart = makeChart()
    ;(document.querySelector('.emboss-sidebar-task .emboss-sidebar-dot') as HTMLElement).click()
    expect(document.querySelector('.emboss-color-picker')).toBeFalsy()
    chart.destroy()
  })
})

// ─── Delete button ───────────────────────────────────────────────────────

describe('Delete button (×)', () => {
  it('renders × button on each cell', () => {
    const chart = makeChart()
    const dels = document.querySelectorAll('.emboss-sidebar-delete')
    expect(dels.length).toBeGreaterThan(0)
    chart.destroy()
  })

  it('clicking × on a task removes it', () => {
    const chart = makeChart()
    const before = chart.state.rows.length
    const taskCell = document.querySelector('[data-id="t1"]') as HTMLElement
    const del = taskCell.querySelector('.emboss-sidebar-delete') as HTMLElement
    del.click()
    expect(chart.state.rows.length).toBe(before - 1)
    expect(chart.state.rows.find(r => r.id === 't1')).toBeFalsy()
    chart.destroy()
  })

  it('clicking × on a phase removes it and its children', () => {
    const chart = makeChart()
    // p1 has children: t1, t2, m1 — 4 rows total to remove
    const phaseCell = document.querySelector('[data-id="p1"]') as HTMLElement
    const del = phaseCell.querySelector('.emboss-sidebar-delete') as HTMLElement
    del.click()
    expect(chart.state.rows.find(r => r.id === 'p1')).toBeFalsy()
    expect(chart.state.rows.find(r => r.id === 't1')).toBeFalsy()
    expect(chart.state.rows.find(r => r.id === 't2')).toBeFalsy()
    expect(chart.state.rows.find(r => r.id === 'm1')).toBeFalsy()
    // p2 and its children should still exist
    expect(chart.state.rows.find(r => r.id === 'p2')).toBeTruthy()
    expect(chart.state.rows.find(r => r.id === 't3')).toBeTruthy()
    chart.destroy()
  })

  it('deleting a task updates parent phase children array', () => {
    const chart = makeChart()
    const phase = chart.state.rows.find(r => r.id === 'p1')!
    expect(phase.children).toContain('t1')
    const taskCell = document.querySelector('[data-id="t1"]') as HTMLElement
    ;(taskCell.querySelector('.emboss-sidebar-delete') as HTMLElement).click()
    // After deletion, p1.children should no longer include t1
    const updatedPhase = chart.state.rows.find(r => r.id === 'p1')!
    expect(updatedPhase.children).not.toContain('t1')
    chart.destroy()
  })
})

// ─── Inline edit ─────────────────────────────────────────────────────────

describe('Inline edit', () => {
  it('clicking a task name opens input', () => {
    const chart = makeChart()
    const nameEl = document.querySelector('.emboss-sidebar-task .emboss-sidebar-name') as HTMLElement
    nameEl.click()
    const input = document.querySelector('.emboss-sidebar-edit-input') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.value).toBe('Wireframes')
    chart.destroy()
  })

  it('Enter key commits the edit', () => {
    const chart = makeChart()
    const nameEl = document.querySelector('.emboss-sidebar-task .emboss-sidebar-name') as HTMLElement
    nameEl.click()
    const input = document.querySelector('.emboss-sidebar-edit-input') as HTMLInputElement
    input.value = 'Updated Name'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(chart.state.rows.find(r => r.id === 't1')!.name).toBe('Updated Name')
    // Input should be gone after commit
    expect(document.querySelector('.emboss-sidebar-edit-input')).toBeFalsy()
    chart.destroy()
  })

  it('Escape reverts the edit', () => {
    const chart = makeChart()
    const nameEl = document.querySelector('.emboss-sidebar-task .emboss-sidebar-name') as HTMLElement
    nameEl.click()
    const input = document.querySelector('.emboss-sidebar-edit-input') as HTMLInputElement
    input.value = 'Something Else'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(chart.state.rows.find(r => r.id === 't1')!.name).toBe('Wireframes')
    chart.destroy()
  })

  it('delete while editing does not trigger edit on other rows', () => {
    const chart = makeChart()
    const before = chart.state.rows.length
    // Click × on t1 — should delete without opening edit on anything
    const taskCell = document.querySelector('[data-id="t1"]') as HTMLElement
    ;(taskCell.querySelector('.emboss-sidebar-delete') as HTMLElement).click()
    expect(chart.state.rows.length).toBe(before - 1)
    // No edit input should be open
    expect(document.querySelector('.emboss-sidebar-edit-input')).toBeFalsy()
    chart.destroy()
  })
})
