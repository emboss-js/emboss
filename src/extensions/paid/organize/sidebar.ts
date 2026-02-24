/**
 * @emboss/core — extensions/paid/organize/sidebar.ts
 * CONTRACT: Section 3.1 (SidebarRenderer), Section 9.6 (sidebar visual spec)
 * BUNDLE: Organize ($79)
 *
 * Creates sidebar container left of chart. CSS grid layout when active.
 * Full mode: var(--emboss-sidebar-w, 280px). Rail mode + collapse button deferred.
 *
 * Per-row renderers:
 *   phase    → chevron + colored pill + name (13px/600) + task count badge
 *   task     → status dot (8px) + name (12.5px)
 *   subtask  → indented, smaller dot (6px) + name (12.5px)
 *   milestone → diamond icon + italic name (12.5px)
 *
 * Scroll: chart body vertical scroll → sidebar body scrollTop (synced).
 * Collapse: click phase chevron → emboss.toggleCollapse(rowId).
 */

import type { Row, EmbossState, EmbossExtension, Scale, SidebarRenderer } from '../../../core/types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusColor(status: string): string {
  if (status === 'active') return 'var(--emboss-ink-3)'
  if (status === 'done') return 'var(--emboss-ink-4)'
  return 'var(--emboss-ink-5)'
}

// ─── Cell renderers ─────────────────────────────────────────────────────────

function renderTaskCell(row: Row, state: EmbossState): HTMLElement {
  const el = document.createElement('div')
  el.className = 'emboss-sidebar-cell emboss-sidebar-task'
  el.style.height = `${state.scale.rowHeight}px`
  el.style.paddingLeft = `${36 + row.depth * 16}px`

  const dot = document.createElement('span')
  dot.className = 'emboss-sidebar-dot'
  dot.style.background = statusColor(row.status)

  const name = document.createElement('span')
  name.className = 'emboss-sidebar-name'
  name.textContent = row.name

  el.appendChild(dot)
  el.appendChild(name)
  return el
}

function renderPhaseCell(row: Row, state: EmbossState): HTMLElement {
  const collapsed = state.collapsed[row.id]
  const color = row.phaseColor || 'var(--emboss-ink-3)'
  const count = row.children ? row.children.length : 0

  const el = document.createElement('div')
  el.className = 'emboss-sidebar-cell emboss-sidebar-phase'
  el.dataset.id = row.id
  el.style.height = `${state.scale.rowHeight}px`
  el.style.paddingLeft = `${12 + row.depth * 16}px`

  const chevron = document.createElement('span')
  chevron.className = 'emboss-sidebar-chevron'
  if (collapsed) chevron.classList.add('collapsed')

  const pill = document.createElement('span')
  pill.className = 'emboss-sidebar-pill'
  pill.style.background = color

  const name = document.createElement('span')
  name.className = 'emboss-sidebar-name emboss-sidebar-phase-name'
  name.textContent = row.name

  const badge = document.createElement('span')
  badge.className = 'emboss-sidebar-badge'
  badge.textContent = String(count)

  el.appendChild(chevron)
  el.appendChild(pill)
  el.appendChild(name)
  el.appendChild(badge)
  return el
}

function renderSubtaskCell(row: Row, state: EmbossState): HTMLElement {
  const el = document.createElement('div')
  el.className = 'emboss-sidebar-cell emboss-sidebar-subtask'
  el.style.height = `${state.scale.rowHeight}px`
  el.style.paddingLeft = `${36 + row.depth * 16}px`

  const dot = document.createElement('span')
  dot.className = 'emboss-sidebar-dot emboss-sidebar-dot-sm'
  dot.style.background = statusColor(row.status)

  const name = document.createElement('span')
  name.className = 'emboss-sidebar-name'
  name.textContent = row.name

  el.appendChild(dot)
  el.appendChild(name)
  return el
}

function renderMilestoneCell(row: Row, state: EmbossState): HTMLElement {
  const el = document.createElement('div')
  el.className = 'emboss-sidebar-cell emboss-sidebar-milestone'
  el.style.height = `${state.scale.rowHeight}px`
  el.style.paddingLeft = `${36 + row.depth * 16}px`

  const diamond = document.createElement('span')
  diamond.className = 'emboss-sidebar-diamond'

  const name = document.createElement('span')
  name.className = 'emboss-sidebar-name emboss-sidebar-milestone-name'
  name.textContent = row.name

  el.appendChild(diamond)
  el.appendChild(name)
  return el
}

// ─── Renderer map (used by init and exposed for override) ───────────────────

const cellRenderers: Record<string, SidebarRenderer> = {
  task: renderTaskCell,
  phase: renderPhaseCell,
  subtask: renderSubtaskCell,
  milestone: renderMilestoneCell,
}

// ─── Extension ──────────────────────────────────────────────────────────────

export const sidebar: EmbossExtension = {
  name: 'sidebar',
  type: 'paid',
  bundle: 'organize',

  sidebarRenderer: cellRenderers,

  init(emboss) {
    let sidebarHeaderEl: HTMLElement | null = null
    let sidebarBodyEl: HTMLElement | null = null

    emboss.on('afterRender', (container: HTMLElement, scale: Scale, state: EmbossState) => {
      // ── First render: create sidebar DOM and wire events ──
      if (!sidebarHeaderEl) {
        sidebarHeaderEl = document.createElement('div')
        sidebarHeaderEl.className = 'emboss-sidebar-header'

        sidebarBodyEl = document.createElement('div')
        sidebarBodyEl.className = 'emboss-sidebar'

        // Insert into grid — before existing header and body
        const header = container.querySelector('.emboss-header')!
        const body = container.querySelector('.emboss-body')!
        container.insertBefore(sidebarHeaderEl, header)
        container.insertBefore(sidebarBodyEl, body)

        // Enable grid layout
        container.classList.add('emboss-has-sidebar')

        // Scroll sync: chart body vertical → sidebar body
        body.addEventListener('scroll', () => {
          sidebarBodyEl!.scrollTop = body.scrollTop
        })

        // Collapse delegation: click chevron → toggleCollapse
        sidebarBodyEl.addEventListener('click', (e: MouseEvent) => {
          const target = e.target as HTMLElement
          const phaseCell = target.closest('.emboss-sidebar-phase') as HTMLElement | null
          if (phaseCell && phaseCell.dataset.id) {
            emboss.toggleCollapse(phaseCell.dataset.id)
          }
        })
      }

      // ── Populate sidebar header ──
      sidebarHeaderEl.textContent = ''
      const label = document.createElement('span')
      label.className = 'emboss-sidebar-header-label'
      label.textContent = 'Tasks'
      sidebarHeaderEl.appendChild(label)

      // ── Render cells ──
      const visibleRows = state.rows.filter(r => !r.hidden)
      const fragment = document.createDocumentFragment()
      for (const row of visibleRows) {
        const renderer = cellRenderers[row.type]
        const cell = renderer ? renderer(row, state) : renderTaskCell(row, state)
        if (cell) fragment.appendChild(cell)
      }
      sidebarBodyEl!.textContent = ''
      sidebarBodyEl!.appendChild(fragment)
    })
  },

  styles: `
/* Grid layout when sidebar is active */
.emboss.emboss-has-sidebar {
  display: grid;
  grid-template-columns: var(--emboss-sidebar-w, 280px) 1fr;
  grid-template-rows: auto 1fr;
}

/* Sidebar header — aligns with chart header via grid row */
.emboss-sidebar-header {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: var(--emboss-surface);
  border-right: 1px solid var(--emboss-border);
  border-bottom: 1px solid var(--emboss-border);
}
.emboss-sidebar-header-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--emboss-ink-3);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

/* Chart header — explicit grid placement, min-width:0 prevents content blowout */
.emboss.emboss-has-sidebar .emboss-header {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
}

/* Sidebar body — syncs vertical scroll from chart body */
.emboss-sidebar {
  grid-column: 1;
  grid-row: 2;
  overflow-y: hidden;
  background: var(--emboss-surface);
  border-right: 1px solid var(--emboss-border);
}

/* Chart body — explicit grid placement, min-width:0 prevents content blowout */
.emboss.emboss-has-sidebar .emboss-body {
  grid-column: 2;
  grid-row: 2;
  min-width: 0;
}

/* Hide redundant phase labels on timeline when sidebar shows them */
.emboss-has-sidebar .emboss-bar-label-phase {
  display: none;
}

/* ─── Cells ─────────────────────────────────────────────────────────────── */

.emboss-sidebar-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 12px;
  border-bottom: 1px solid var(--emboss-border);
  white-space: nowrap;
  overflow: hidden;
}

/* Status dot */
.emboss-sidebar-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.emboss-sidebar-dot-sm {
  width: 6px;
  height: 6px;
}

/* Name — ink scale: phase=ink, task=ink-2, subtask=ink-3, milestone=ink-2 */
.emboss-sidebar-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12.5px;
  color: var(--emboss-ink);
}
.emboss-sidebar-task .emboss-sidebar-name {
  color: var(--emboss-ink-2);
}
.emboss-sidebar-subtask .emboss-sidebar-name {
  color: var(--emboss-ink-3);
}
.emboss-sidebar-milestone .emboss-sidebar-name {
  color: var(--emboss-ink-2);
}

/* ─── Phase cell ────────────────────────────────────────────────────────── */

.emboss-sidebar-phase {
  cursor: pointer;
}
.emboss-sidebar-phase:hover {
  background: var(--emboss-surface-2);
}
.emboss-sidebar-phase-name {
  font-size: 13px;
  font-weight: 600;
}

/* Chevron */
.emboss-sidebar-chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--emboss-ink-4);
  transition: transform 0.15s;
  transform: rotate(90deg);
}
.emboss-sidebar-chevron::before {
  content: '';
  display: block;
  width: 0;
  height: 0;
  border-left: 4px solid currentColor;
  border-top: 3px solid transparent;
  border-bottom: 3px solid transparent;
}
.emboss-sidebar-chevron.collapsed {
  transform: rotate(0deg);
}

/* Colored pill */
.emboss-sidebar-pill {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Task count badge */
.emboss-sidebar-badge {
  margin-left: auto;
  font-size: 10px;
  font-weight: 500;
  color: var(--emboss-ink-3);
  background: var(--emboss-surface-2);
  border: 1px solid var(--emboss-border);
  padding: 1px 6px;
  border-radius: 8px;
}

/* ─── Milestone cell ────────────────────────────────────────────────────── */

.emboss-sidebar-diamond {
  width: 10px;
  height: 10px;
  transform: rotate(45deg);
  border: 1.5px solid var(--emboss-ink-3);
  border-radius: 1px;
  flex-shrink: 0;
}
.emboss-sidebar-milestone-name {
  font-style: italic;
}
`,
}
