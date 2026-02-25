/**
 * @emboss/core — extensions/paid/columns/columns.ts
 * CONTRACT: Section 9.6 (sidebar columns), emboss-bundle-restructure-v2.md
 * BUNDLE: Columns ($29, requires Organize)
 *
 * Adds data columns (Duration, Dates) to the sidebar with inline editing.
 * Requires the Organize extension — if registered without it, silently skip.
 *
 * Column layout appended to sidebar cells:
 *   | name area (flex:1) | DURATION (64px) | DATES (120px) |
 *
 * ALL event listeners use delegation. Popover elements attach to document.body.
 */

import type { Row, EmbossState, EmbossExtension, Scale } from '../../../core/types'

// ─── Date helpers ────────────────────────────────────────────────────────────

function dayToDate(startDate: Date, dayOffset: number): Date {
  const d = new Date(startDate)
  d.setDate(d.getDate() + dayOffset)
  return d
}

function dateToDayOffset(projectStart: Date, date: Date): number {
  const msPerDay = 86400000
  return Math.round((date.getTime() - projectStart.getTime()) / msPerDay)
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateRange(startDate: Date, endDate: Date, isDense: boolean): string {
  if (isDense) {
    return `${startDate.getMonth() + 1}/${startDate.getDate()} \u2013 ${endDate.getMonth() + 1}/${endDate.getDate()}`
  }

  const startMonth = startDate.toLocaleString('en', { month: 'short' })
  const endMonth = endDate.toLocaleString('en', { month: 'short' })
  const startDay = startDate.getDate()
  const endDay = endDate.getDate()
  const startYear = startDate.getFullYear()
  const endYear = endDate.getFullYear()

  if (startYear !== endYear) {
    return `${startMonth} ${startDay} \u2018${String(startYear).slice(2)} \u2013 ${endMonth} ${endDay} \u2018${String(endYear).slice(2)}`
  }
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} \u2013 ${endDay}`
  }
  return `${startMonth} ${startDay} \u2013 ${endMonth} ${endDay}`
}

function formatSingleDate(date: Date, isDense: boolean): string {
  if (isDense) return `${date.getMonth() + 1}/${date.getDate()}`
  return `${date.toLocaleString('en', { month: 'short' })} ${date.getDate()}`
}

// ─── Column widths ──────────────────────────────────────────────────────────

const COL_WIDTHS: Record<string, number> = {
  duration: 76,
  dates: 120,
}

const COL_LABELS: Record<string, string> = {
  duration: 'DURATION',
  dates: 'DATES',
}

// ─── Extension ──────────────────────────────────────────────────────────────

export const columns: EmbossExtension = {
  name: 'columns',
  type: 'paid',
  bundle: 'columns',

  init(emboss) {
    // Check that Organize (sidebar) is registered
    const hasSidebar = (emboss as any).extensions
      ? (emboss as any).extensions.some((e: EmbossExtension) => e.name === 'sidebar')
      : false
    if (!hasSidebar) {
      console.info('Emboss: Columns requires the Organize extension.')
      return
    }

    // Read initial column config from options
    let activeColumns: string[] = (emboss as any).options?.sidebar?.columns || []
    let datePopoverEl: HTMLElement | null = null

    // ── Close helpers ──
    function closeDatePopover() {
      if (datePopoverEl) {
        datePopoverEl.remove()
        datePopoverEl = null
      }
    }

    // ── setSidebarColumns runtime API ──
    ;(emboss as any).setSidebarColumns = (cols: string[]) => {
      activeColumns = cols
      emboss.render()
    }

    // ── afterRender: augment sidebar with columns ──
    emboss.on('afterRender', (container: HTMLElement, scale: Scale, state: EmbossState) => {
      if (activeColumns.length === 0) return

      const isCollapsed = container.classList.contains('emboss-sidebar-collapsed')
      const isDense = state.density === 'dense'

      // Calculate extra width for columns
      const extraWidth = activeColumns.reduce((sum, col) => sum + (COL_WIDTHS[col] || 0), 0)

      if (isCollapsed) {
        // Rail mode: no columns, reset sidebar width
        container.style.removeProperty('--emboss-sidebar-w')
        return
      }

      // Set sidebar width to accommodate columns
      const baseWidth = isDense ? 220 : (state.density === 'presentation' ? 320 : 280)
      container.style.setProperty('--emboss-sidebar-w', `${baseWidth + extraWidth}px`)

      // ── Augment header with column headers ──
      const sidebarHeader = container.querySelector('.emboss-sidebar-header') as HTMLElement
      if (sidebarHeader) {
        // Remove any existing column headers from prior render
        sidebarHeader.querySelectorAll('.emboss-sidebar-header-col').forEach(el => el.remove())

        for (const col of activeColumns) {
          const headerCol = document.createElement('div')
          headerCol.className = `emboss-sidebar-header-col emboss-sidebar-col-${col}`
          headerCol.textContent = COL_LABELS[col] || col.toUpperCase()
          sidebarHeader.appendChild(headerCol)
        }
      }

      // ── Augment cells with column data ──
      const sidebarBody = container.querySelector('.emboss-sidebar') as HTMLElement
      if (!sidebarBody) return

      const cells = sidebarBody.querySelectorAll('.emboss-sidebar-cell')
      cells.forEach(cellNode => {
        const cell = cellNode as HTMLElement
        const rowId = cell.dataset.id
        if (!rowId) return
        const row = state.rows.find(r => r.id === rowId)
        if (!row) return

        // Remove existing column data from prior render
        cell.querySelectorAll('.emboss-sidebar-col').forEach(el => el.remove())

        for (const col of activeColumns) {
          const colEl = document.createElement('div')
          colEl.className = `emboss-sidebar-col ${col}`

          if (col === 'duration') {
            if (row.type === 'milestone') {
              colEl.textContent = '\u2014' // em dash
            } else if (row.type === 'phase') {
              colEl.textContent = ''
            } else {
              colEl.textContent = `${row.duration}d`
              colEl.classList.add('editable')
              colEl.addEventListener('click', (e) => {
                e.stopPropagation()
                closeDatePopover()
                startDurationEdit(colEl, row, emboss)
              })
            }
          } else if (col === 'dates') {
            if (row.type === 'phase') {
              colEl.textContent = ''
            } else {
              const startDate = dayToDate(scale.startDate, row.start)
              if (row.type === 'milestone' || row.duration === 0) {
                colEl.textContent = formatSingleDate(startDate, isDense)
              } else {
                const endDate = dayToDate(scale.startDate, row.start + row.duration)
                colEl.textContent = formatDateRange(startDate, endDate, isDense)
              }
              colEl.classList.add('editable')
              colEl.addEventListener('click', (e) => {
                e.stopPropagation()
                openDatePopover(colEl, row, emboss, scale.startDate)
              })
            }
          }

          cell.appendChild(colEl)
        }
      })
    })

    // ── Duration inline edit ──
    function startDurationEdit(cell: HTMLElement, row: Row, inst: typeof emboss) {
      const original = row.duration

      const input = document.createElement('input')
      input.type = 'number'
      input.className = 'emboss-column-input'
      input.value = String(row.duration)
      input.min = '1'
      input.style.width = '40px'
      input.style.textAlign = 'right'

      let committed = false
      function commit() {
        if (committed) return
        committed = true
        const val = parseInt(input.value)
        const newDuration = (val && val > 0) ? val : original
        if (input.parentElement) input.remove()
        inst.updateRow(row.id, { duration: newDuration })
      }

      input.addEventListener('blur', () => {
        requestAnimationFrame(commit)
      })
      input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur() }
        if (e.key === 'Escape') {
          committed = true
          if (input.parentElement) input.remove()
          inst.render()
        }
      })

      cell.textContent = ''
      cell.appendChild(input)
      input.focus()
      input.select()
    }

    // ── Date picker popover ──
    function openDatePopover(cell: HTMLElement, row: Row, inst: typeof emboss, projectStart: Date) {
      closeDatePopover()

      const startDate = dayToDate(projectStart, row.start)
      const endDate = dayToDate(projectStart, row.start + row.duration)

      datePopoverEl = document.createElement('div')
      datePopoverEl.className = 'emboss-date-popover'

      const startInput = document.createElement('input')
      startInput.type = 'date'
      startInput.className = 'emboss-date-input'
      startInput.value = toISODate(startDate)

      const arrow = document.createElement('span')
      arrow.className = 'emboss-date-arrow'
      arrow.textContent = '\u2192'

      const endInput = document.createElement('input')
      endInput.type = 'date'
      endInput.className = 'emboss-date-input'
      endInput.value = toISODate(endDate)

      // Milestones: only show start date
      if (row.type === 'milestone' || row.duration === 0) {
        datePopoverEl.appendChild(startInput)
      } else {
        datePopoverEl.appendChild(startInput)
        datePopoverEl.appendChild(arrow)
        datePopoverEl.appendChild(endInput)
      }

      const rect = cell.getBoundingClientRect()
      datePopoverEl.style.top = `${rect.bottom + 4}px`
      datePopoverEl.style.left = `${rect.left}px`
      document.body.appendChild(datePopoverEl)

      function apply() {
        const newStart = dateToDayOffset(projectStart, new Date(startInput.value))
        if (row.type === 'milestone' || row.duration === 0) {
          inst.updateRow(row.id, { start: newStart })
        } else {
          const newEnd = dateToDayOffset(projectStart, new Date(endInput.value))
          const newDuration = Math.max(1, newEnd - newStart)
          inst.updateRow(row.id, { start: newStart, duration: newDuration })
        }
        closeDatePopover()
      }

      startInput.addEventListener('change', apply)
      endInput.addEventListener('change', apply)

      // Close on click outside
      requestAnimationFrame(() => {
        document.addEventListener('mousedown', function onOutside(e: MouseEvent) {
          const target = e.target as HTMLElement
          if (datePopoverEl && !datePopoverEl.contains(target) && target !== cell) {
            closeDatePopover()
            document.removeEventListener('mousedown', onOutside)
          }
        })
      })
    }
  },

  styles: `
/* ─── Column headers ───────────────────────────────────────────────────── */

.emboss-sidebar-header-col {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--emboss-ink-4);
  padding: 8px 8px;
  border-left: 1px solid var(--emboss-border);
  text-align: center;
  flex-shrink: 0;
  white-space: nowrap;
  box-sizing: border-box;
}
.emboss-sidebar-col-duration { width: 76px; }
.emboss-sidebar-col-dates { width: 120px; }

/* ─── Column data cells ────────────────────────────────────────────────── */

.emboss-sidebar-col {
  padding: 0 8px;
  border-left: 1px solid var(--emboss-border);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
  font-size: 11.5px;
  color: var(--emboss-ink-3);
  white-space: nowrap;
  display: flex;
  align-items: center;
  height: 100%;
  flex-shrink: 0;
  box-sizing: border-box;
}
.emboss-sidebar-col.editable {
  cursor: pointer;
}
.emboss-sidebar-col.editable:hover {
  background: var(--emboss-surface-2);
}
.emboss-sidebar-col.duration {
  width: 76px;
  justify-content: flex-end;
}
.emboss-sidebar-col.dates {
  width: 120px;
  justify-content: flex-start;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 11px;
}

/* ─── Duration edit input ──────────────────────────────────────────────── */

.emboss-column-input {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
  font-size: 11.5px;
  border: 1.5px solid var(--emboss-ink-4);
  border-radius: 4px;
  padding: 2px 4px;
  background: var(--emboss-surface);
  color: var(--emboss-ink);
  outline: none;
}
.emboss-column-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
}

/* ─── Date picker popover ──────────────────────────────────────────────── */

.emboss-date-popover {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--emboss-surface, #fff);
  border: 1px solid var(--emboss-border, #e5e7eb);
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  z-index: 100;
}
.emboss-date-input {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
  font-size: 12px;
  border: 1px solid var(--emboss-border, #e5e7eb);
  border-radius: 6px;
  padding: 4px 8px;
  background: var(--emboss-surface, #fff);
  color: var(--emboss-ink, #1f2937);
}
.emboss-date-arrow {
  color: var(--emboss-ink-4);
  font-size: 14px;
}

/* ─── Dense mode column overrides ──────────────────────────────────────── */

.emboss-dense .emboss-sidebar-col-duration,
.emboss-dense .emboss-sidebar-col.duration { width: 56px; }
.emboss-dense .emboss-sidebar-col-dates,
.emboss-dense .emboss-sidebar-col.dates { width: 96px; }
.emboss-dense .emboss-sidebar-col { font-size: 10px; padding: 0 4px; }
.emboss-dense .emboss-sidebar-header-col { font-size: 9px; padding: 6px 4px; }

/* ─── Rail mode: hide columns ──────────────────────────────────────────── */

.emboss-sidebar-collapsed .emboss-sidebar-col,
.emboss-sidebar-collapsed .emboss-sidebar-header-col {
  display: none;
}
`,
}
