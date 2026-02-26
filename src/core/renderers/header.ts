/**
 * @emboss-js/core — renderers/header.ts
 * CONTRACT: Section 3.3 (HeaderRenderer)
 *
 * Timeline header showing time divisions. View mode determines granularity:
 * - Day: Month labels top, individual dates below, weekends dimmed
 * - Week: Month labels with year
 * - Month: Abbreviated month labels (Feb, Mar, Apr)
 * - Quarter: Q1 2026, Q2 2026 with month sub-labels
 */

import type { Scale, EmbossState } from '../types'
import { addDays, isWeekend, getMonthName, daysInMonth } from '../dates'

export function renderHeader(scale: Scale, state: EmbossState): HTMLElement {
  switch (state.view) {
    case 'day': return renderDayHeader(scale, state)
    case 'week': return renderWeekHeader(scale, state)
    case 'month': return renderMonthHeader(scale, state)
    case 'quarter': return renderQuarterHeader(scale, state)
  }
}

function renderDayHeader(scale: Scale, state: EmbossState): HTMLElement {
  const el = document.createElement('div')
  el.className = 'emboss-header-inner'

  const topRow = document.createElement('div')
  topRow.className = 'emboss-header-row emboss-header-row-top'
  const bottomRow = document.createElement('div')
  bottomRow.className = 'emboss-header-row emboss-header-row-bottom'

  // Group days by month for top row
  let currentMonth = -1
  let monthSpan: HTMLElement | null = null
  let monthDayCount = 0

  for (let d = 0; d < scale.totalDays; d++) {
    const date = addDays(scale.startDate, d)
    const month = date.getMonth()
    const year = date.getFullYear()

    // Top row: month labels
    if (month !== currentMonth) {
      if (monthSpan) monthSpan.style.width = `${monthDayCount * scale.dayWidth}px`
      monthSpan = document.createElement('span')
      monthSpan.className = 'emboss-header-cell emboss-header-month'
      monthSpan.textContent = `${getMonthName(month)} ${year}`
      topRow.appendChild(monthSpan)
      currentMonth = month
      monthDayCount = 0
    }
    monthDayCount++

    // Bottom row: day numbers
    const dayCell = document.createElement('span')
    dayCell.className = 'emboss-header-cell emboss-header-day'
    if (isWeekend(date)) dayCell.classList.add('emboss-header-weekend')
    dayCell.style.width = `${scale.dayWidth}px`
    dayCell.textContent = `${date.getDate()}`
    bottomRow.appendChild(dayCell)
  }
  // Finalize last month span
  if (monthSpan) monthSpan.style.width = `${monthDayCount * scale.dayWidth}px`

  el.appendChild(topRow)
  el.appendChild(bottomRow)
  return el
}

function renderWeekHeader(scale: Scale, state: EmbossState): HTMLElement {
  const el = document.createElement('div')
  el.className = 'emboss-header-inner'

  const topRow = document.createElement('div')
  topRow.className = 'emboss-header-row emboss-header-row-top'
  const bottomRow = document.createElement('div')
  bottomRow.className = 'emboss-header-row emboss-header-row-bottom'

  // Group days by month for top row, mark week starts for bottom row
  let currentMonth = -1
  let monthSpan: HTMLElement | null = null
  let monthDayCount = 0

  for (let d = 0; d < scale.totalDays; d++) {
    const date = addDays(scale.startDate, d)
    const month = date.getMonth()
    const year = date.getFullYear()

    // Top row: month labels
    if (month !== currentMonth) {
      if (monthSpan) monthSpan.style.width = `${monthDayCount * scale.dayWidth}px`
      monthSpan = document.createElement('span')
      monthSpan.className = 'emboss-header-cell emboss-header-month'
      monthSpan.textContent = `${getMonthName(month)} ${year}`
      topRow.appendChild(monthSpan)
      currentMonth = month
      monthDayCount = 0
    }
    monthDayCount++

    // Bottom row: week-start dates (Monday)
    if (date.getDay() === 1) {
      const weekCell = document.createElement('span')
      weekCell.className = 'emboss-header-cell emboss-header-week'
      weekCell.style.width = `${7 * scale.dayWidth}px`
      const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
      weekCell.textContent = date.toLocaleDateString('en-US', opts)
      bottomRow.appendChild(weekCell)
    }
  }
  // Finalize last month span
  if (monthSpan) monthSpan.style.width = `${monthDayCount * scale.dayWidth}px`

  el.appendChild(topRow)
  el.appendChild(bottomRow)
  return el
}

function renderMonthHeader(scale: Scale, state: EmbossState): HTMLElement {
  const el = document.createElement('div')
  el.className = 'emboss-header-inner'

  const row = document.createElement('div')
  row.className = 'emboss-header-row'

  let currentMonth = -1
  let span: HTMLElement | null = null
  let dayCount = 0

  for (let d = 0; d < scale.totalDays; d++) {
    const date = addDays(scale.startDate, d)
    const month = date.getMonth()

    if (month !== currentMonth) {
      if (span) span.style.width = `${dayCount * scale.dayWidth}px`
      span = document.createElement('span')
      span.className = 'emboss-header-cell emboss-header-month'
      span.textContent = getMonthName(month, state.density === 'presentation')
      row.appendChild(span)
      currentMonth = month
      dayCount = 0
    }
    dayCount++
  }
  if (span) span.style.width = `${dayCount * scale.dayWidth}px`

  el.appendChild(row)
  return el
}

function renderQuarterHeader(scale: Scale, state: EmbossState): HTMLElement {
  const el = document.createElement('div')
  el.className = 'emboss-header-inner'
  const isDense = state.density === 'dense'

  const topRow = document.createElement('div')
  topRow.className = 'emboss-header-row emboss-header-row-top'
  // Dense+Quarter: single row, no month sub-labels
  const bottomRow = isDense ? null : document.createElement('div')
  if (bottomRow) bottomRow.className = 'emboss-header-row emboss-header-row-bottom'

  let currentQuarter = -1
  let currentMonth = -1
  let quarterSpan: HTMLElement | null = null
  let monthSpan: HTMLElement | null = null
  let quarterDayCount = 0
  let monthDayCount = 0

  for (let d = 0; d < scale.totalDays; d++) {
    const date = addDays(scale.startDate, d)
    const month = date.getMonth()
    const year = date.getFullYear()
    const quarter = Math.floor(month / 3)

    // Top row: quarter labels
    if (quarter !== currentQuarter || (d === 0)) {
      if (quarterSpan) quarterSpan.style.width = `${quarterDayCount * scale.dayWidth}px`
      quarterSpan = document.createElement('span')
      quarterSpan.className = 'emboss-header-cell emboss-header-quarter'
      quarterSpan.textContent = `Q${quarter + 1} ${year}`
      topRow.appendChild(quarterSpan)
      currentQuarter = quarter
      quarterDayCount = 0
    }
    quarterDayCount++

    // Bottom row: month sub-labels (skipped in dense)
    if (bottomRow && month !== currentMonth) {
      if (monthSpan) monthSpan.style.width = `${monthDayCount * scale.dayWidth}px`
      monthSpan = document.createElement('span')
      monthSpan.className = 'emboss-header-cell emboss-header-month'
      monthSpan.textContent = getMonthName(month)
      bottomRow.appendChild(monthSpan)
      currentMonth = month
      monthDayCount = 0
    }
    if (bottomRow) monthDayCount++
  }
  if (quarterSpan) quarterSpan.style.width = `${quarterDayCount * scale.dayWidth}px`
  if (monthSpan && bottomRow) monthSpan.style.width = `${monthDayCount * scale.dayWidth}px`

  el.appendChild(topRow)
  if (bottomRow) el.appendChild(bottomRow)
  // Dense: remove top border-bottom since there's no second row
  if (isDense) topRow.classList.remove('emboss-header-row-top')
  return el
}

export const HEADER_STYLES = `
.emboss-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--emboss-surface);
  border-bottom: 1px solid var(--emboss-border);
  overflow: hidden;
  min-height: min-content;
}
.emboss-header-inner {
  display: flex;
  flex-direction: column;
}
.emboss-header-row {
  display: flex;
  align-items: center;
  height: 28px;
}
.emboss-header-cell {
  display: inline-flex;
  align-items: center;
  padding: 0 6px;
  font-size: var(--emboss-label-size);
  color: var(--emboss-ink-3);
  white-space: nowrap;
  overflow: hidden;
  box-sizing: border-box;
  flex-shrink: 0;
}
.emboss-header-row-top {
  border-bottom: 1px solid var(--emboss-border);
}
.emboss-header-month {
  font-weight: 600;
}
.emboss-header-week {
  font-size: 10px;
}
.emboss-header-day {
  justify-content: center;
  padding: 0;
}
.emboss-header-weekend {
  color: var(--emboss-ink-4);
  opacity: 0.6;
}
.emboss-header-quarter {
  font-weight: 600;
}
/* ─── Dense header ────────────────────────────────────────────────────── */
.emboss-dense .emboss-header-row { height: 24px; }
.emboss-dense .emboss-header-cell { font-size: 10px; }
.emboss-dense .emboss-header-week { font-size: 9px; }
/* ─── Presentation header ─────────────────────────────────────────────── */
.emboss-presentation .emboss-header-row { height: 32px; }
.emboss-presentation .emboss-header-cell { font-size: 13px; }
.emboss-presentation .emboss-header-week { font-size: 11px; }
`;
