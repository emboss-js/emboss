/**
 * @emboss/core — state.ts
 * CONTRACT: Section 2 (State), Section 2 scale table
 *
 * Creates initial state, recalculates scale on view/density change,
 * handles all state mutations. Extensions never mutate state directly.
 */

import type { EmbossState, Scale, Row } from './types'

// Scale values: view × density → pixel values
// From Spec Section 2 table
const SCALES: Record<string, Record<string, Omit<Scale, 'totalDays' | 'startDate'>>> = {
  working: {
    day:     { dayWidth: 44, rowHeight: 44, barHeight: 26, barRadius: 13, labelSize: 11.5 },
    week:    { dayWidth: 32, rowHeight: 44, barHeight: 26, barRadius: 13, labelSize: 11.5 },
    month:   { dayWidth: 12, rowHeight: 40, barHeight: 22, barRadius: 11, labelSize: 11.5 },
    quarter: { dayWidth: 7,  rowHeight: 40, barHeight: 22, barRadius: 11, labelSize: 11.5 },
  },
  presentation: {
    day:     { dayWidth: 44, rowHeight: 56, barHeight: 32, barRadius: 16, labelSize: 12.5 },
    week:    { dayWidth: 32, rowHeight: 56, barHeight: 32, barRadius: 16, labelSize: 12.5 },
    month:   { dayWidth: 12, rowHeight: 52, barHeight: 28, barRadius: 14, labelSize: 12.5 },
    quarter: { dayWidth: 7,  rowHeight: 52, barHeight: 28, barRadius: 14, labelSize: 12.5 },
  },
  dense: {
    day:     { dayWidth: 44, rowHeight: 34, barHeight: 20, barRadius: 10, labelSize: 10 },
    week:    { dayWidth: 32, rowHeight: 34, barHeight: 20, barRadius: 10, labelSize: 10 },
    month:   { dayWidth: 12, rowHeight: 32, barHeight: 18, barRadius: 9,  labelSize: 10 },
    quarter: { dayWidth: 7,  rowHeight: 32, barHeight: 18, barRadius: 9,  labelSize: 10 },
  },
}

export function calcScale(view: string, density: string, rows: Row[], startDate: Date): Scale {
  const base = SCALES[density]?.[view] ?? SCALES.working.week
  const maxEnd = rows.reduce((m, r) => Math.max(m, r.start + r.duration), 0)
  return { ...base, totalDays: Math.max(maxEnd + 7, 30), startDate }
}

export function createState(rows: Row[], startDate: Date): EmbossState {
  return {
    rows,
    view: 'week',
    density: 'working',
    theme: 'grayscale',
    collapsed: {},
    selected: null,
    hoveredRow: null,
    settings: {
      markWeekends: false,
      excludeWeekends: false,
      holidays: [],
      ignoredDays: [],
    },
    scale: calcScale('week', 'working', rows, startDate),
  }
}

export function recalcHidden(state: EmbossState): void {
  const { rows, collapsed } = state
  for (const row of rows) {
    if (!row.parentId) { row.hidden = false; continue }
    // Walk up parent chain — if any ancestor is collapsed, this row is hidden
    let pid: string | null = row.parentId
    let hide = false
    while (pid) {
      if (collapsed[pid]) { hide = true; break }
      const parent = rows.find(r => r.id === pid)
      pid = parent?.parentId ?? null
    }
    row.hidden = hide
  }
}
