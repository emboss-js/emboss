/**
 * @emboss-js/core — extensions/paid/organize/sidebar.ts
 * CONTRACT: Section 3.1 (SidebarRenderer), Section 9.6 (sidebar visual spec)
 * BUNDLE: Organize ($79)
 *
 * Creates sidebar container left of chart. CSS grid layout when active.
 * Full mode: var(--emboss-sidebar-w, 280px).
 *
 * Per-row renderers:
 *   phase    → chevron + colored pill + name (13px/600) + task count badge
 *   task     → status dot (8px) + name (12.5px)
 *   subtask  → indented, smaller dot (6px) + name (12.5px)
 *   milestone → diamond icon + italic name (12.5px)
 *
 * Interactive features:
 *   "+" button in header → dropdown menu (Add Phase / Add Task / Add Milestone)
 *   Phase pill click → color picker popover
 *   Inline name editing → click name → input field (blur commits)
 *   × delete button → hover to reveal, click to delete row + children
 *
 * ALL event listeners use delegation on persistent container elements.
 */

import type { Row, EmbossState, EmbossExtension, Scale, SidebarRenderer } from '../../../core/types'

// ─── Helpers ────────────────────────────────────────────────────────────────

const VIVID_PALETTE = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#f97316',
]

/** Resolve the vivid color for a row's parent phase. Returns null if no phase found. */
function resolveVividColor(row: Row, rows: Row[]): string | null {
  let phase: Row | undefined
  if (row.type === 'phase') phase = row
  else if (row.parentId) {
    const parent = rows.find(r => r.id === row.parentId)
    if (parent?.type === 'phase') phase = parent
    else if (parent?.parentId) phase = rows.find(r => r.id === parent.parentId && r.type === 'phase')
  }
  if (!phase) return null
  if (phase.phaseColor) return phase.phaseColor
  const idx = rows.filter(r => r.type === 'phase').indexOf(phase)
  return VIVID_PALETTE[(idx >= 0 ? idx : 0) % VIVID_PALETTE.length]
}

/** Row height for sidebar cells — phases are shorter in presentation mode. */
function cellHeight(row: Row, state: EmbossState): number {
  if (row.type === 'phase' && state.density === 'presentation') return 32
  return state.scale.rowHeight
}

// ─── Avatars ────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316']

function hashToColor(name: string): string {
  let hash = 0
  for (const char of name) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function createAvatar(row: Row, isVivid: boolean, size: 22 | 18 = 22): HTMLElement {
  const el = document.createElement('div')
  el.className = size === 18 ? 'emboss-avatar emboss-avatar-sm' : 'emboss-avatar'

  if (isVivid) {
    const bg = row.assigneeColor || (row.assignee ? hashToColor(row.assignee) : '')
    if (bg) el.style.background = bg
  }

  const initials = document.createElement('span')
  initials.className = 'emboss-avatar-initials'
  initials.textContent = getInitials(row.assignee || '')
  el.appendChild(initials)

  return el
}

function createGrip(): HTMLElement {
  const grip = document.createElement('span')
  grip.className = 'emboss-sidebar-grip'
  grip.innerHTML = '<svg width="6" height="10" viewBox="0 0 6 10">' +
    '<circle cx="1.5" cy="1.5" r="1" fill="currentColor"/>' +
    '<circle cx="4.5" cy="1.5" r="1" fill="currentColor"/>' +
    '<circle cx="1.5" cy="5" r="1" fill="currentColor"/>' +
    '<circle cx="4.5" cy="5" r="1" fill="currentColor"/>' +
    '<circle cx="1.5" cy="8.5" r="1" fill="currentColor"/>' +
    '<circle cx="4.5" cy="8.5" r="1" fill="currentColor"/></svg>'
  return grip
}

// ─── Cell renderers ─────────────────────────────────────────────────────────
// Vivid = inline color on dot/pill/diamond. Grayscale = no inline style, CSS default.
// `_isVivid` is set each render from container class check.

let _isVivid = false

function renderTaskCell(row: Row, state: EmbossState): HTMLElement {
  const el = document.createElement('div')
  el.className = 'emboss-sidebar-cell emboss-sidebar-task'
  el.dataset.id = row.id
  el.style.height = `${state.scale.rowHeight}px`
  el.style.paddingLeft = `${48 + row.depth * 16}px`

  const dot = document.createElement('span')
  dot.className = 'emboss-sidebar-dot'
  if (_isVivid) {
    const c = resolveVividColor(row, state.rows)
    if (c) dot.style.background = c
  }

  const name = document.createElement('span')
  name.className = 'emboss-sidebar-name'
  name.textContent = row.name

  const del = document.createElement('span')
  del.className = 'emboss-sidebar-delete'
  del.textContent = '\u00d7'

  const addChild = document.createElement('span')
  addChild.className = 'emboss-sidebar-add-child'
  addChild.textContent = '+'
  addChild.dataset.addParent = row.id

  const nameArea = document.createElement('div')
  nameArea.className = 'emboss-sidebar-name-area'
  nameArea.appendChild(name)
  if (row.assignee) nameArea.appendChild(createAvatar(row, _isVivid, 22))
  nameArea.appendChild(addChild)
  nameArea.appendChild(del)

  el.prepend(createGrip())
  el.appendChild(dot)
  el.appendChild(nameArea)
  return el
}

function renderPhaseCell(row: Row, state: EmbossState): HTMLElement {
  const collapsed = state.collapsed[row.id]
  const count = row.children ? row.children.length : 0

  const el = document.createElement('div')
  el.className = 'emboss-sidebar-cell emboss-sidebar-phase'
  el.dataset.id = row.id
  el.style.height = `${cellHeight(row, state)}px`
  el.style.paddingLeft = `${16 + row.depth * 16}px`

  const chevron = document.createElement('span')
  chevron.className = 'emboss-sidebar-chevron'
  if (collapsed) chevron.classList.add('collapsed')

  const pill = document.createElement('span')
  pill.className = 'emboss-sidebar-pill'
  pill.dataset.phaseId = row.id
  if (_isVivid) {
    const c = resolveVividColor(row, state.rows)
    if (c) pill.style.backgroundColor = c
  }

  const name = document.createElement('span')
  name.className = 'emboss-sidebar-name emboss-sidebar-phase-name'
  name.textContent = row.name

  const badge = document.createElement('span')
  badge.className = 'emboss-sidebar-badge'
  badge.textContent = String(count)

  const del = document.createElement('span')
  del.className = 'emboss-sidebar-delete'
  del.textContent = '\u00d7'

  const addChild = document.createElement('span')
  addChild.className = 'emboss-sidebar-add-child'
  addChild.textContent = '+'
  addChild.dataset.addParent = row.id

  const nameArea = document.createElement('div')
  nameArea.className = 'emboss-sidebar-name-area'
  nameArea.appendChild(name)
  nameArea.appendChild(badge)
  nameArea.appendChild(addChild)
  nameArea.appendChild(del)

  el.prepend(createGrip())
  el.appendChild(chevron)
  el.appendChild(pill)
  el.appendChild(nameArea)
  return el
}

function renderSubtaskCell(row: Row, state: EmbossState): HTMLElement {
  const el = document.createElement('div')
  el.className = 'emboss-sidebar-cell emboss-sidebar-subtask'
  el.dataset.id = row.id
  el.style.height = `${state.scale.rowHeight}px`
  el.style.paddingLeft = `${48 + row.depth * 16}px`

  const dot = document.createElement('span')
  dot.className = 'emboss-sidebar-dot emboss-sidebar-dot-sm'
  if (_isVivid) {
    const c = resolveVividColor(row, state.rows)
    if (c) dot.style.background = c
  }

  const name = document.createElement('span')
  name.className = 'emboss-sidebar-name'
  name.textContent = row.name

  const del = document.createElement('span')
  del.className = 'emboss-sidebar-delete'
  del.textContent = '\u00d7'

  const nameArea = document.createElement('div')
  nameArea.className = 'emboss-sidebar-name-area'
  nameArea.appendChild(name)
  if (row.assignee) nameArea.appendChild(createAvatar(row, _isVivid, 22))
  nameArea.appendChild(del)

  el.prepend(createGrip())
  el.appendChild(dot)
  el.appendChild(nameArea)
  return el
}

function renderMilestoneCell(row: Row, state: EmbossState): HTMLElement {
  const el = document.createElement('div')
  el.className = 'emboss-sidebar-cell emboss-sidebar-milestone'
  el.dataset.id = row.id
  el.style.height = `${state.scale.rowHeight}px`
  el.style.paddingLeft = `${48 + row.depth * 16}px`

  const diamond = document.createElement('span')
  diamond.className = 'emboss-sidebar-diamond'
  if (_isVivid) {
    const c = resolveVividColor(row, state.rows)
    if (c) diamond.style.borderColor = c
  }

  const name = document.createElement('span')
  name.className = 'emboss-sidebar-name emboss-sidebar-milestone-name'
  name.textContent = row.name

  const del = document.createElement('span')
  del.className = 'emboss-sidebar-delete'
  del.textContent = '\u00d7'

  const nameArea = document.createElement('div')
  nameArea.className = 'emboss-sidebar-name-area'
  nameArea.appendChild(name)
  nameArea.appendChild(del)

  el.prepend(createGrip())
  el.appendChild(diamond)
  el.appendChild(nameArea)
  return el
}

// ─── Rail cell renderers (collapsed sidebar) ────────────────────────────────
// Minimal centered indicators: phase pill w/ first letter, dots, diamonds.

function renderRailPhaseCell(row: Row, state: EmbossState): HTMLElement {
  const el = document.createElement('div')
  el.className = 'emboss-sidebar-cell emboss-sidebar-rail-cell emboss-sidebar-phase'
  el.dataset.id = row.id
  el.style.height = `${cellHeight(row, state)}px`

  const pill = document.createElement('span')
  pill.className = 'emboss-rail-pill'
  pill.textContent = row.name.charAt(0).toUpperCase()
  if (_isVivid) {
    const c = resolveVividColor(row, state.rows)
    if (c) pill.style.background = c
  }

  el.appendChild(pill)
  return el
}

function renderRailTaskCell(row: Row, state: EmbossState): HTMLElement {
  const el = document.createElement('div')
  el.className = 'emboss-sidebar-cell emboss-sidebar-rail-cell emboss-sidebar-task'
  el.dataset.id = row.id
  el.style.height = `${state.scale.rowHeight}px`

  const dot = document.createElement('span')
  dot.className = 'emboss-sidebar-dot'
  if (_isVivid) {
    const c = resolveVividColor(row, state.rows)
    if (c) dot.style.background = c
  }

  el.appendChild(dot)
  return el
}

function renderRailSubtaskCell(row: Row, state: EmbossState): HTMLElement {
  const el = document.createElement('div')
  el.className = 'emboss-sidebar-cell emboss-sidebar-rail-cell emboss-sidebar-subtask'
  el.dataset.id = row.id
  el.style.height = `${state.scale.rowHeight}px`

  const dot = document.createElement('span')
  dot.className = 'emboss-sidebar-dot emboss-sidebar-dot-sm'
  if (_isVivid) {
    const c = resolveVividColor(row, state.rows)
    if (c) dot.style.background = c
  }

  el.appendChild(dot)
  return el
}

function renderRailMilestoneCell(row: Row, state: EmbossState): HTMLElement {
  const el = document.createElement('div')
  el.className = 'emboss-sidebar-cell emboss-sidebar-rail-cell emboss-sidebar-milestone'
  el.dataset.id = row.id
  el.style.height = `${state.scale.rowHeight}px`

  const diamond = document.createElement('span')
  diamond.className = 'emboss-sidebar-diamond'
  if (_isVivid) {
    const c = resolveVividColor(row, state.rows)
    if (c) diamond.style.borderColor = c
  }

  el.appendChild(diamond)
  return el
}

// ─── Renderer maps ──────────────────────────────────────────────────────────

const cellRenderers: Record<string, SidebarRenderer> = {
  task: renderTaskCell,
  phase: renderPhaseCell,
  subtask: renderSubtaskCell,
  milestone: renderMilestoneCell,
}

const railRenderers: Record<string, SidebarRenderer> = {
  task: renderRailTaskCell,
  phase: renderRailPhaseCell,
  subtask: renderRailSubtaskCell,
  milestone: renderRailMilestoneCell,
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

    // ── Popup state (managed outside render cycle) ──
    let addMenuEl: HTMLElement | null = null
    let colorPickerEl: HTMLElement | null = null
    let colorPickerPhaseId: string | null = null
    let editingRowId: string | null = null
    let isNewRow = false // true when editingRowId was just created via "+"
    let isDragging = false
    let containerRef: HTMLElement | null = null
    let sidebarCollapsed = false

    // ── Close helpers ──
    function closeAddMenu() {
      if (addMenuEl) {
        addMenuEl.remove()
        addMenuEl = null
      }
    }

    function closeColorPicker() {
      if (colorPickerEl) {
        colorPickerEl.remove()
        colorPickerEl = null
        colorPickerPhaseId = null
      }
    }

    // ── Find context phase for adding tasks/milestones ──
    function getPhaseContext(): Row | null {
      const sel = emboss.state.selected
      if (sel) {
        const selRow = emboss.state.rows.find(r => r.id === sel)
        if (selRow?.type === 'phase') return selRow
        if (selRow?.parentId) {
          const parent = emboss.state.rows.find(r => r.id === selRow.parentId)
          if (parent?.type === 'phase') return parent
        }
      }
      return emboss.state.rows.find(r => r.type === 'phase') || null
    }

    // ── Open add menu ──
    function openAddMenu(btnEl: HTMLElement) {
      if (addMenuEl) { closeAddMenu(); return }

      closeColorPicker()
      addMenuEl = document.createElement('div')
      addMenuEl.className = 'emboss-add-menu'

      const items = [
        { label: 'Add Phase', type: 'phase' as const },
        { label: 'Add Task', type: 'task' as const },
        { label: 'Add Milestone', type: 'milestone' as const },
      ]

      for (const item of items) {
        const itemEl = document.createElement('div')
        itemEl.className = 'emboss-add-menu-item'
        itemEl.dataset.addType = item.type
        itemEl.textContent = item.label
        addMenuEl.appendChild(itemEl)
      }

      const rect = btnEl.getBoundingClientRect()
      addMenuEl.style.top = `${rect.bottom + 4}px`
      addMenuEl.style.left = `${rect.right - 160}px`
      document.body.appendChild(addMenuEl)

      requestAnimationFrame(() => {
        document.addEventListener('mousedown', onMenuOutside)
      })
    }

    function onMenuOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.closest('.emboss-sidebar-add-btn')) return
      if (addMenuEl && !addMenuEl.contains(target)) {
        closeAddMenu()
        document.removeEventListener('mousedown', onMenuOutside)
      }
    }

    // ── Handle menu item click ──
    function handleAddMenuItem(type: 'phase' | 'task' | 'milestone') {
      closeAddMenu()
      document.removeEventListener('mousedown', onMenuOutside)

      const id = `new-${Date.now()}`
      const phase = getPhaseContext()

      // Set BEFORE addRow — addRow calls render() synchronously,
      // and afterRender needs this to auto-start inline edit
      editingRowId = id
      isNewRow = true

      if (type === 'phase') {
        const newRow: Row = {
          id, type: 'phase', name: 'New Phase', depth: 0, parentId: null,
          collapsed: false, hidden: false, start: 0, duration: 14,
          progress: 0, status: 'upcoming', dependencies: [],
          children: [],
        }
        emboss.addRow(newRow)
      } else if (type === 'task') {
        const newRow: Row = {
          id, type: 'task', name: 'New Task', depth: phase ? 1 : 0,
          parentId: phase?.id || null, collapsed: false, hidden: false,
          start: phase ? phase.start : 0, duration: 5,
          progress: 0, status: 'upcoming', dependencies: [],
        }
        if (phase?.children) phase.children.push(id)
        const lastChild = phase ? findLastDescendant(phase.id) : null
        emboss.addRow(newRow, lastChild || phase?.id)
      } else {
        const newRow: Row = {
          id, type: 'milestone', name: 'New Milestone', depth: phase ? 1 : 0,
          parentId: phase?.id || null, collapsed: false, hidden: false,
          start: phase ? phase.start + phase.duration : 0, duration: 0,
          progress: 0, status: 'upcoming', dependencies: [],
        }
        if (phase?.children) phase.children.push(id)
        const lastChild = phase ? findLastDescendant(phase.id) : null
        emboss.addRow(newRow, lastChild || phase?.id)
      }
    }

    function findLastDescendant(parentId: string): string | null {
      const rows = emboss.state.rows
      const parentIdx = rows.findIndex(r => r.id === parentId)
      if (parentIdx === -1) return null

      // Walk forward — a contiguous run of descendants has parentId in our subtree
      const subtree = new Set([parentId])
      let lastId: string | null = null
      for (let i = parentIdx + 1; i < rows.length; i++) {
        const pid = rows[i].parentId
        if (pid && subtree.has(pid)) {
          subtree.add(rows[i].id)
          lastId = rows[i].id
        } else {
          break
        }
      }
      return lastId
    }

    // ── Add child row to parent ──
    function handleAddChild(parentId: string) {
      const parent = emboss.state.rows.find(r => r.id === parentId)
      if (!parent) return

      const id = `new-${Date.now()}`
      const isPhase = parent.type === 'phase'
      const childType = isPhase ? 'task' : 'subtask'
      const childDepth = parent.depth + 1

      editingRowId = id
      isNewRow = true

      const newRow: Row = {
        id, type: childType, name: isPhase ? 'New Task' : 'New Subtask',
        depth: childDepth, parentId: parent.id,
        collapsed: false, hidden: false,
        start: parent.start, duration: 5,
        progress: 0, status: 'upcoming', dependencies: [],
      }

      if (!parent.children) parent.children = []
      parent.children.push(id)

      // If parent is collapsed, expand it
      if (emboss.state.collapsed[parentId]) {
        emboss.toggleCollapse(parentId)
      }

      const lastChild = findLastDescendant(parentId)
      emboss.addRow(newRow, lastChild || parentId)
    }

    // ── Delete row + children ──
    function deleteRow(rowId: string) {
      const row = emboss.state.rows.find(r => r.id === rowId)
      if (!row) return

      // Clear edit state if deleting the row being edited
      if (editingRowId === rowId) {
        editingRowId = null
        isNewRow = false
      }

      const idsToRemove = new Set([rowId])

      // Collect children and grandchildren
      if (row.children?.length) {
        for (const childId of row.children) {
          idsToRemove.add(childId)
          const child = emboss.state.rows.find(r => r.id === childId)
          if (child?.children?.length) {
            child.children.forEach(id => idsToRemove.add(id))
          }
        }
      }

      // Batch remove: filter once, clean parent refs once, render once
      emboss.state.rows = emboss.state.rows.filter(r => !idsToRemove.has(r.id))
      for (const r of emboss.state.rows) {
        if (r.children) r.children = r.children.filter(id => !idsToRemove.has(id))
      }
      emboss.render()
    }

    // ── Open color picker (vivid only) ──
    function openColorPicker(pillEl: HTMLElement, phaseId: string) {
      // Color picker disabled in grayscale mode
      const isVivid = containerRef?.classList.contains('emboss-vivid') ?? false
      if (!isVivid) return

      if (colorPickerEl && colorPickerPhaseId === phaseId) {
        closeColorPicker()
        return
      }
      closeColorPicker()
      closeAddMenu()

      colorPickerPhaseId = phaseId
      const row = emboss.state.rows.find(r => r.id === phaseId)
      if (!row) return
      const currentColor = (row.phaseColor || '').toLowerCase()

      colorPickerEl = document.createElement('div')
      colorPickerEl.className = 'emboss-color-picker'

      const grid = document.createElement('div')
      grid.className = 'emboss-color-grid'
      for (const c of VIVID_PALETTE) {
        const swatch = document.createElement('div')
        swatch.className = 'emboss-color-swatch'
        swatch.dataset.color = c
        swatch.style.background = c
        if (c.toLowerCase() === currentColor) swatch.classList.add('active')
        grid.appendChild(swatch)
      }
      colorPickerEl.appendChild(grid)

      const rect = pillEl.getBoundingClientRect()
      colorPickerEl.style.top = `${rect.bottom + 4}px`
      colorPickerEl.style.left = `${rect.left}px`
      document.body.appendChild(colorPickerEl)

      requestAnimationFrame(() => {
        document.addEventListener('mousedown', onPickerOutside)
      })
    }

    function onPickerOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.closest('.emboss-sidebar-pill')) return
      if (colorPickerEl && !colorPickerEl.contains(target)) {
        closeColorPicker()
        document.removeEventListener('mousedown', onPickerOutside)
      }
    }

    // ── Inline edit ──
    function startInlineEdit(nameEl: HTMLElement, rowId: string) {
      const row = emboss.state.rows.find(r => r.id === rowId)
      if (!row) return

      const wasNew = isNewRow && editingRowId === rowId
      editingRowId = rowId
      const originalName = row.name

      const input = document.createElement('input')
      input.className = 'emboss-sidebar-edit-input'
      input.value = row.name
      input.style.fontSize = row.type === 'phase' ? '13px' : '12.5px'
      input.style.fontWeight = row.type === 'phase' ? '600' : '400'
      if (row.type === 'phase') {
        input.classList.add('emboss-sidebar-edit-phase')
      }

      nameEl.textContent = ''
      nameEl.appendChild(input)
      input.focus()
      input.select()

      let committed = false

      function commit() {
        if (committed) return
        committed = true
        const val = input.value.trim()
        editingRowId = null
        isNewRow = false

        // Remove input from DOM BEFORE triggering render —
        // otherwise afterRender sees the input and skips cell rebuild
        if (input.parentElement) input.remove()

        if (!val) {
          if (wasNew) {
            deleteRow(rowId)
          } else {
            emboss.render()
          }
        } else if (val !== originalName) {
          emboss.updateRow(rowId, { name: val })
        } else {
          emboss.render()
        }
      }

      input.addEventListener('blur', () => {
        // Delay commit so that if blur was caused by clicking × or a menu item,
        // that click handler fires first (and sets committed or deletes the row)
        requestAnimationFrame(() => {
          if (!input.parentElement) return  // already removed by delete
          commit()
        })
      })
      input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); commit() }
        if (e.key === 'Escape') {
          committed = true
          editingRowId = null
          isNewRow = false
          if (input.parentElement) input.remove()
          if (wasNew) {
            deleteRow(rowId)
          } else {
            emboss.render()
          }
        }
      })
    }

    // ══════════════════════════════════════════════════════════════════════════
    // EVENT DELEGATION — all on persistent container elements
    // ══════════════════════════════════════════════════════════════════════════

    emboss.on('afterRender', (container: HTMLElement, scale: Scale, state: EmbossState) => {
      containerRef = container
      _isVivid = container.classList.contains('emboss-vivid')
      container.classList.toggle('emboss-sidebar-collapsed', sidebarCollapsed)

      // ── First render: create sidebar DOM and wire delegated listeners ──
      if (!sidebarHeaderEl) {
        sidebarHeaderEl = document.createElement('div')
        sidebarHeaderEl.className = 'emboss-sidebar-header'

        sidebarBodyEl = document.createElement('div')
        sidebarBodyEl.className = 'emboss-sidebar'

        const header = container.querySelector('.emboss-header')!
        const body = container.querySelector('.emboss-body')!
        container.insertBefore(sidebarHeaderEl, header)
        container.insertBefore(sidebarBodyEl, body)
        container.classList.add('emboss-has-sidebar')

        // Scroll sync
        body.addEventListener('scroll', () => {
          sidebarBodyEl!.scrollTop = body.scrollTop
        })

        // ── DELEGATED: header click ──
        sidebarHeaderEl.addEventListener('click', (e: MouseEvent) => {
          const target = e.target as HTMLElement
          if (target.closest('.emboss-sidebar-collapse')) {
            sidebarCollapsed = !sidebarCollapsed
            container.classList.toggle('emboss-sidebar-collapsed', sidebarCollapsed)
            emboss.render()
            return
          }
          if (target.closest('.emboss-sidebar-add-btn')) {
            openAddMenu(target.closest('.emboss-sidebar-add-btn') as HTMLElement)
          }
        })

        // ── DELEGATED: body click (collapse, inline edit, delete, add-child) ──
        sidebarBodyEl.addEventListener('click', (e: MouseEvent) => {
          const target = e.target as HTMLElement

          // Add child button
          if (target.closest('.emboss-sidebar-add-child')) {
            e.stopPropagation()
            const btn = target.closest('.emboss-sidebar-add-child') as HTMLElement
            if (btn.dataset.addParent) handleAddChild(btn.dataset.addParent)
            return
          }

          // Delete button
          if (target.closest('.emboss-sidebar-delete')) {
            e.stopPropagation()
            const cell = target.closest('.emboss-sidebar-cell') as HTMLElement | null
            if (cell?.dataset.id) deleteRow(cell.dataset.id)
            return
          }

          // Phase cell — each sub-element has an explicit handler
          const phaseCell = target.closest('.emboss-sidebar-phase') as HTMLElement | null
          if (phaseCell && phaseCell.dataset.id) {
            if (target.closest('.emboss-sidebar-chevron')) {
              e.stopPropagation()
              emboss.toggleCollapse(phaseCell.dataset.id)
              return
            }
            if (target.closest('.emboss-sidebar-name')) {
              e.stopPropagation()
              startInlineEdit(target.closest('.emboss-sidebar-name') as HTMLElement, phaseCell.dataset.id)
              return
            }
            if (target.closest('.emboss-sidebar-pill')) {
              e.stopPropagation()
              openColorPicker(target.closest('.emboss-sidebar-pill') as HTMLElement, phaseCell.dataset.id)
              return
            }
            // Background click: no-op (drag handler takes over on hold)
            return
          }

          // Task/subtask/milestone name → inline edit
          const cell = target.closest('.emboss-sidebar-cell') as HTMLElement | null
          if (cell?.dataset.id && target.closest('.emboss-sidebar-name')) {
            e.stopPropagation()
            startInlineEdit(target.closest('.emboss-sidebar-name') as HTMLElement, cell.dataset.id)
          }
        })

        // ── DELEGATED: add menu + color swatch clicks (on document.body) ──
        document.body.addEventListener('click', (e: MouseEvent) => {
          const target = e.target as HTMLElement
          const menuItem = target.closest('.emboss-add-menu-item') as HTMLElement | null
          if (menuItem?.dataset.addType) {
            handleAddMenuItem(menuItem.dataset.addType as 'phase' | 'task' | 'milestone')
          }
          const swatch = target.closest('.emboss-color-swatch') as HTMLElement | null
          if (swatch?.dataset.color && colorPickerPhaseId) {
            emboss.updateRow(colorPickerPhaseId, { phaseColor: swatch.dataset.color })
            closeColorPicker()
            document.removeEventListener('mousedown', onPickerOutside)
          }
        })

        // ── DELEGATED: drag reorder ──────────────────────────────────────────
        let dragTimer: number | null = null
        let dragStartY = 0
        let dragStartX = 0
        let dragTargetDepth: number | null = null
        let dragPendingRowId: string | null = null
        let draggedRowId: string | null = null
        let draggedEl: HTMLElement | null = null
        let dropIndicator: HTMLElement | null = null
        let dropTargetIndex: number | null = null
        let ghostEl: HTMLElement | null = null
        let ghostOffsetY = 0

        function findPhaseForIdx(idx: number, rows: Row[]): Row | null {
          for (let i = idx - 1; i >= 0; i--) {
            if (rows[i].type === 'phase') return rows[i]
          }
          return null
        }

        function getPhaseGroupEnd(phaseIdx: number, rows: Row[]): number {
          for (let i = phaseIdx + 1; i < rows.length; i++) {
            if (rows[i].type === 'phase') return i
          }
          return rows.length
        }

        function findParentForDepth(insertIdx: number, targetDepth: number, visible: Row[]): Row | null {
          if (targetDepth === 0) return null
          if (targetDepth === 1) {
            for (let i = insertIdx - 1; i >= 0; i--) {
              if (visible[i].type === 'phase') return visible[i]
            }
            return null
          }
          // depth 2: scan backward for first task at depth 1 (stop if hits a phase first)
          for (let i = insertIdx - 1; i >= 0; i--) {
            if (visible[i].type === 'phase') return null
            if (visible[i].type === 'task' && visible[i].depth === 1) return visible[i]
          }
          return null
        }

        function isValidDrop(dragging: Row, target: number, visible: Row[], targetDepth?: number): boolean {
          const cur = visible.indexOf(dragging)
          if (target === cur || target === cur + 1) return false

          const depth = targetDepth ?? dragging.depth

          // depth 0: must land at phase boundary
          if (depth === 0) {
            if (dragging.type === 'phase') {
              const groupEnd = getPhaseGroupEnd(cur, visible)
              if (target >= cur && target <= groupEnd) return false
            }
            const next = visible[target]
            return !next || next.type === 'phase'
          }

          // depth 1: must have a phase above
          if (depth === 1) {
            return findPhaseForIdx(target, visible) !== null
          }

          // depth 2: must have a task above
          if (depth === 2) {
            return findParentForDepth(target, 2, visible) !== null
          }

          return false
        }

        function doDrop(id: string, visIdx: number) {
          const rows = emboss.state.rows
          const visible = rows.filter(r => !r.hidden)
          const row = rows.find(r => r.id === id)
          if (!row) return

          // Collect dragged group (phase + its children)
          const group: Row[] = [row]
          if (row.type === 'phase' && row.children?.length) {
            for (const r of rows) {
              if (row.children.includes(r.id)) group.push(r)
            }
          }

          // Map visible index → actual array position
          const targetRow = visible[visIdx]
          const actualTarget = targetRow ? rows.indexOf(targetRow) : rows.length

          const groupIds = new Set(group.map(r => r.id))
          const remaining = rows.filter(r => !groupIds.has(r.id))

          // Adjust for items removed before target
          let adj = actualTarget
          for (let i = 0; i < actualTarget; i++) {
            if (groupIds.has(rows[i].id)) adj--
          }
          remaining.splice(adj, 0, ...group)
          emboss.state.rows = remaining

          // Horizontal re-parent: depth changed
          if (dragTargetDepth !== null && dragTargetDepth !== row.depth) {
            const newType = dragTargetDepth === 0 ? 'phase' : dragTargetDepth === 1 ? 'task' : 'subtask'
            const oldParentRow = row.parentId ? remaining.find(r => r.id === row.parentId) || null : null
            const newParentRow = findParentForDepth(remaining.indexOf(row), dragTargetDepth, remaining)

            // Emit onRowReparent — veto support
            const result = emboss.emit('onRowReparent', row, oldParentRow, newParentRow, newType)
            if (result === false) {
              emboss.render()
              return
            }

            // Remove from old parent's children
            if (oldParentRow?.children) {
              oldParentRow.children = oldParentRow.children.filter(cid => cid !== row.id)
            }

            // Update row
            const oldChildren = row.children || []
            row.depth = dragTargetDepth
            row.type = newType
            row.parentId = newParentRow?.id || null

            // Add to new parent's children
            if (newParentRow) {
              if (!newParentRow.children) newParentRow.children = []
              newParentRow.children.push(row.id)
            }

            // If becoming phase: initialize children array
            if (newType === 'phase' && !row.children) {
              row.children = []
            }

            // Cascade children: if a task becomes a phase, its existing subtasks become tasks
            if (newType === 'phase' && oldChildren.length) {
              for (const childId of oldChildren) {
                const child = remaining.find(r => r.id === childId)
                if (child) {
                  child.depth = 1
                  child.type = 'task'
                  child.parentId = row.id
                }
              }
              row.children = oldChildren
            }
          } else {
            // Vertical-only re-parent: task/milestone moved to a different phase
            if (row.type === 'task' || row.type === 'milestone') {
              const newParent = findPhaseForIdx(remaining.indexOf(row), remaining)
              if (newParent && newParent.id !== row.parentId) {
                const oldPhase = remaining.find(r => r.id === row.parentId)
                if (oldPhase?.children) {
                  oldPhase.children = oldPhase.children.filter(cid => cid !== row.id)
                }
                row.parentId = newParent.id
                row.depth = 1
                if (!newParent.children) newParent.children = []
                newParent.children.push(row.id)
              }
            }
          }

          emboss.emit('onRowReorder', id, adj)
          emboss.render()
        }

        function beginDrag(rowId: string) {
          isDragging = true
          draggedRowId = rowId
          const row = emboss.state.rows.find(r => r.id === rowId)
          if (row) dragTargetDepth = row.depth
          draggedEl = sidebarBodyEl!.querySelector(`[data-id="${rowId}"]`) as HTMLElement
          if (!draggedEl) return

          // Ghost — clone follows cursor
          const rowRect = draggedEl.getBoundingClientRect()
          ghostOffsetY = dragStartY - rowRect.top
          ghostEl = draggedEl.cloneNode(true) as HTMLElement
          ghostEl.classList.add('emboss-drag-ghost')
          ghostEl.style.position = 'fixed'
          ghostEl.style.width = `${rowRect.width}px`
          ghostEl.style.left = `${rowRect.left}px`
          ghostEl.style.top = `${rowRect.top}px`
          ghostEl.style.pointerEvents = 'none'
          ghostEl.style.zIndex = '1000'
          document.body.appendChild(ghostEl)

          // Original becomes placeholder
          draggedEl.classList.add('emboss-sidebar-dragging')

          dropIndicator = document.createElement('div')
          dropIndicator.className = 'emboss-drop-indicator'
          dropIndicator.style.display = 'none'
          sidebarBodyEl!.appendChild(dropIndicator)

          document.addEventListener('mousemove', onDragMove)
          document.addEventListener('mouseup', onDragEnd)
          document.addEventListener('keydown', onDragKey)
        }

        function onDragMove(e: MouseEvent) {
          if (!isDragging || !sidebarBodyEl || !draggedRowId) return

          // Move ghost with cursor
          if (ghostEl) ghostEl.style.top = `${e.clientY - ghostOffsetY}px`

          const rect = sidebarBodyEl.getBoundingClientRect()
          const y = e.clientY - rect.top + sidebarBodyEl.scrollTop
          const visible = emboss.state.rows.filter(r => !r.hidden)

          // Accumulate row heights to find drop index
          let accum = 0
          let idx = visible.length
          for (let i = 0; i < visible.length; i++) {
            const rh = cellHeight(visible[i], emboss.state)
            if (y < accum + rh / 2) { idx = i; break }
            accum += rh
          }
          idx = Math.max(0, Math.min(idx, visible.length))

          const dragging = emboss.state.rows.find(r => r.id === draggedRowId)
          if (!dragging) return

          // Horizontal depth calculation
          const dx = e.clientX - dragStartX
          const depthDelta = Math.round(dx / 40)
          let targetDepth = Math.max(0, Math.min(2, dragging.depth + depthDelta))
          // Phases (depth 0) can never indent
          if (dragging.type === 'phase' && dragging.children?.length) targetDepth = 0
          // Validate via findParentForDepth — if no valid parent exists at target depth, snap back
          if (targetDepth > 0 && !findParentForDepth(idx, targetDepth, visible)) {
            targetDepth = dragging.depth
          }
          dragTargetDepth = targetDepth

          if (isValidDrop(dragging, idx, visible, dragTargetDepth)) {
            dropTargetIndex = idx
            dropIndicator!.style.display = 'block'
            const dropY = visible.slice(0, idx).reduce((sum, r) => sum + cellHeight(r, emboss.state), 0)
            dropIndicator!.style.top = `${dropY}px`
            dropIndicator!.style.left = `${16 + dragTargetDepth * 16}px`
          } else {
            dropTargetIndex = null
            dropIndicator!.style.display = 'none'
          }
        }

        function onDragEnd() {
          if (isDragging && dropTargetIndex !== null && draggedRowId) {
            doDrop(draggedRowId, dropTargetIndex)
          }
          cleanupDrag()
        }

        function onDragKey(e: KeyboardEvent) {
          if (e.key === 'Escape') cleanupDrag()
        }

        function cleanupDrag() {
          isDragging = false
          if (draggedEl) draggedEl.classList.remove('emboss-sidebar-dragging')
          if (ghostEl) ghostEl.remove()
          ghostEl = null
          ghostOffsetY = 0
          dragStartX = 0
          dragTargetDepth = null
          if (dropIndicator) dropIndicator.remove()
          dropIndicator = null
          draggedRowId = null
          draggedEl = null
          dropTargetIndex = null
          dragPendingRowId = null
          document.removeEventListener('mousemove', onDragMove)
          document.removeEventListener('mouseup', onDragEnd)
          document.removeEventListener('keydown', onDragKey)
        }

        sidebarBodyEl.addEventListener('mousedown', (e: MouseEvent) => {
          const target = e.target as HTMLElement
          const grip = target.closest('.emboss-sidebar-grip')
          if (!grip) return
          const cell = grip.closest('.emboss-sidebar-cell[data-id]') as HTMLElement | null
          if (!cell?.dataset.id) return

          dragPendingRowId = cell.dataset.id
          dragStartY = e.clientY
          dragStartX = e.clientX
          dragTimer = window.setTimeout(() => {
            dragTimer = null
            if (dragPendingRowId) beginDrag(dragPendingRowId)
          }, 150) as unknown as number
        })

        sidebarBodyEl.addEventListener('mousemove', (e: MouseEvent) => {
          if (dragTimer && dragPendingRowId && (Math.abs(e.clientY - dragStartY) > 5 || Math.abs(e.clientX - dragStartX) > 5)) {
            clearTimeout(dragTimer)
            dragTimer = null
            beginDrag(dragPendingRowId)
            dragPendingRowId = null
          }
        })

        sidebarBodyEl.addEventListener('mouseup', () => {
          if (dragTimer) {
            clearTimeout(dragTimer)
            dragTimer = null
            dragPendingRowId = null
          }
        })
      }

      // ── Populate sidebar header ──
      sidebarHeaderEl.innerHTML = ''

      const headerArea = document.createElement('div')
      headerArea.className = 'emboss-sidebar-header-area'

      const label = document.createElement('span')
      label.className = 'emboss-sidebar-header-label'
      label.textContent = 'Tasks'
      headerArea.appendChild(label)

      const addBtn = document.createElement('button')
      addBtn.className = 'emboss-sidebar-add-btn'
      addBtn.textContent = '+'
      headerArea.appendChild(addBtn)

      const collapseBtn = document.createElement('button')
      collapseBtn.className = 'emboss-sidebar-collapse'
      collapseBtn.textContent = sidebarCollapsed ? '\u25B6' : '\u25C0'
      headerArea.appendChild(collapseBtn)

      sidebarHeaderEl.appendChild(headerArea)

      // ── Render cells ──
      // If user is actively typing in an input, don't destroy it
      const activeInput = sidebarBodyEl!.querySelector('.emboss-sidebar-edit-input')
      if (activeInput || isDragging) return

      const visibleRows = state.rows.filter(r => !r.hidden)
      const renderers = sidebarCollapsed ? railRenderers : cellRenderers
      const fragment = document.createDocumentFragment()
      for (const row of visibleRows) {
        const renderer = renderers[row.type]
        const cell = renderer ? renderer(row, state) : renderTaskCell(row, state)
        if (cell) fragment.appendChild(cell)
      }
      sidebarBodyEl!.innerHTML = ''
      sidebarBodyEl!.appendChild(fragment)

      // Auto-start inline edit for newly added rows + scroll into view
      if (editingRowId) {
        const newCell = sidebarBodyEl!.querySelector(`[data-id="${editingRowId}"]`) as HTMLElement | null
        if (newCell) {
          const nameEl = newCell.querySelector('.emboss-sidebar-name') as HTMLElement
          if (nameEl) {
            startInlineEdit(nameEl, editingRowId)
            newCell.scrollIntoView({ block: 'nearest' })
          }
        }
      }

      // ── Inline timeline phases (rail mode only) ──
      // When sidebar is collapsed to rail, phase rows get inline labels on the timeline
      // so users can still see phase names and toggle collapse without the full sidebar.
      const barsEl = container.querySelector('.emboss-bars') as HTMLElement
      if (barsEl) {
        barsEl.querySelectorAll('.emboss-inline-phase').forEach(el => el.remove())

        if (sidebarCollapsed) {
          const isDense = state.density === 'dense'
          let inlineY = 0
          visibleRows.forEach((row, index) => {
            const rh = cellHeight(row, emboss.state)
            if (row.type !== 'phase') { inlineY += rh; return }

            const el = document.createElement('div')
            el.className = 'emboss-inline-phase'
            el.dataset.id = row.id
            el.style.top = `${inlineY}px`
            el.style.height = `${rh}px`

            const chevron = document.createElement('span')
            chevron.className = 'emboss-inline-chevron'
            chevron.textContent = state.collapsed[row.id] ? '\u25B6' : '\u25BC'

            const name = document.createElement('span')
            name.className = 'emboss-inline-phase-name'
            name.textContent = row.name
            if (_isVivid) {
              const c = resolveVividColor(row, state.rows)
              if (c) name.style.color = c
            }

            el.appendChild(chevron)
            el.appendChild(name)

            if (!isDense) {
              const childCount = row.children?.length || 0
              if (childCount > 0) {
                const count = document.createElement('span')
                count.className = 'emboss-inline-phase-count'
                count.textContent = String(childCount)
                el.appendChild(count)
              }
            }

            chevron.addEventListener('click', (e) => {
              e.stopPropagation()
              emboss.toggleCollapse(row.id)
            })

            barsEl.appendChild(el)
            inlineY += rh
          })
        }
      }
    })
  },

  styles: `
/* Grid layout when sidebar is active */
.emboss.emboss-has-sidebar {
  display: grid;
  grid-template-columns: var(--emboss-sidebar-w, 280px) 1fr;
  grid-template-rows: auto 1fr;
}

/* Sidebar header */
.emboss-sidebar-header {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px 0 16px;
  background: var(--emboss-surface);
  border-right: 1px solid var(--emboss-border);
  border-bottom: 1px solid var(--emboss-border);
}
.emboss-sidebar-header-area {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
}
.emboss-sidebar-header-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--emboss-ink-3);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  flex: 1;
}

/* "+" button */
.emboss-sidebar-add-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--emboss-ink-3);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.emboss-sidebar-add-btn:hover {
  background: var(--emboss-surface-2);
  color: var(--emboss-ink);
}

/* Add menu dropdown */
.emboss-add-menu {
  position: fixed;
  z-index: 50;
  min-width: 160px;
  background: var(--emboss-surface, #fff);
  border: 1px solid var(--emboss-border, #e5e7eb);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  padding: 4px 0;
}
.emboss-add-menu-item {
  padding: 8px 14px;
  font-size: 13px;
  color: var(--emboss-ink, #1f2937);
  cursor: pointer;
}
.emboss-add-menu-item:hover {
  background: var(--emboss-surface-2, #f3f4f6);
}

/* Chart header — grid placement */
.emboss.emboss-has-sidebar .emboss-header {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
}

/* Sidebar body */
.emboss-sidebar {
  grid-column: 1;
  grid-row: 2;
  overflow-y: hidden;
  background: var(--emboss-surface);
  border-right: 1px solid var(--emboss-border);
}

/* Chart body — grid placement */
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
  position: relative;
}
.emboss-sidebar-name-area {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  min-width: 0;
}

/* Status dot — grayscale default, vivid color set inline */
.emboss-sidebar-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--emboss-ink-3);
}
.emboss-sidebar-dot-sm {
  width: 6px;
  height: 6px;
  opacity: 0.7;
}

/* Name */
.emboss-sidebar-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12.5px;
  color: var(--emboss-ink);
  text-decoration: none;
  cursor: text;
  flex: 1;
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

/* ─── Delete button ─────────────────────────────────────────────────────── */

.emboss-sidebar-delete {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1;
  color: var(--emboss-ink-4);
  cursor: pointer;
  border-radius: 3px;
  opacity: 0;
  transition: opacity 0.15s;
}
.emboss-sidebar-cell:hover .emboss-sidebar-delete {
  opacity: 1;
}
.emboss-sidebar-delete:hover {
  color: var(--emboss-ink-2);
  background: var(--emboss-surface-2);
}

/* ─── Grip handle ──────────────────────────────────────────────────────── */

.emboss-sidebar-grip {
  display: flex; align-items: center; justify-content: center;
  width: 12px; height: 20px; flex-shrink: 0;
  color: var(--emboss-ink-5); cursor: grab;
  opacity: 0; transition: opacity 0.15s;
  position: absolute; left: 4px; top: 50%; transform: translateY(-50%);
}
.emboss-sidebar-cell:hover .emboss-sidebar-grip { opacity: 1; }
.emboss-presentation .emboss-sidebar-grip { display: none; }

/* ─── Add child button ─────────────────────────────────────────────────── */

.emboss-sidebar-add-child {
  width: 16px; height: 16px; display: flex;
  align-items: center; justify-content: center; flex-shrink: 0;
  font-size: 14px; color: var(--emboss-ink-4); cursor: pointer;
  border-radius: 3px; opacity: 0; transition: opacity 0.15s;
}
.emboss-sidebar-cell:hover .emboss-sidebar-add-child { opacity: 1; }
.emboss-sidebar-add-child:hover { color: var(--emboss-ink-2); background: var(--emboss-surface-2); }
.emboss-presentation .emboss-sidebar-add-child { display: none; }

/* ─── Phase cell ────────────────────────────────────────────────────────── */

.emboss-sidebar-phase {
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
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  color: var(--emboss-ink-4);
  cursor: pointer;
  transition: transform 0.15s;
  transform: rotate(90deg);
  border-radius: 4px;
}
.emboss-sidebar-chevron:hover {
  background: var(--emboss-surface-2);
}
.emboss-sidebar-chevron::before {
  content: '';
  display: block;
  width: 0;
  height: 0;
  border-left: 5px solid currentColor;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
}
.emboss-sidebar-chevron.collapsed {
  transform: rotate(0deg);
}

/* Colored pill — 10px dot with 24px hit area via padding + background-clip */
.emboss-sidebar-pill {
  width: 24px;
  height: 24px;
  padding: 7px;
  background-clip: content-box;
  border-radius: 50%;
  flex-shrink: 0;
  background-color: var(--emboss-ink-3);
}
/* Clickable only in vivid mode */
.emboss-vivid .emboss-sidebar-pill {
  cursor: pointer;
}

/* Task count badge */
.emboss-sidebar-badge {
  font-size: 10px;
  font-weight: 500;
  color: var(--emboss-ink-3);
  background: var(--emboss-surface-2);
  border: 1px solid var(--emboss-border);
  padding: 1px 6px;
  border-radius: 8px;
  flex-shrink: 0;
}

/* ─── Milestone cell ────────────────────────────────────────────────────── */

.emboss-sidebar-diamond {
  width: 10px;
  height: 10px;
  transform: rotate(45deg);
  border: 1.5px solid var(--emboss-ink-4);
  border-radius: 1px;
  flex-shrink: 0;
}
.emboss-sidebar-milestone-name {
  font-style: italic;
}

/* ─── Inline edit input ─────────────────────────────────────────────────── */

.emboss-sidebar-edit-input {
  width: 100%;
  padding: 2px 6px;
  border: 1px solid var(--emboss-ink-4);
  border-radius: 6px;
  background: var(--emboss-surface, #fff);
  color: var(--emboss-ink, #1f2937);
  outline: none;
  font-family: inherit;
}
.emboss-sidebar-edit-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.emboss-sidebar-edit-phase {
  border-color: var(--emboss-ink-4) !important;
}

/* ─── Color picker ──────────────────────────────────────────────────────── */

.emboss-color-picker {
  position: fixed;
  z-index: 50;
  background: var(--emboss-surface, #fff);
  border: 1px solid var(--emboss-border, #e5e7eb);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  padding: 8px;
}
.emboss-color-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.emboss-color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
}
.emboss-color-swatch:hover {
  transform: scale(1.15);
}
.emboss-color-swatch.active {
  border-color: var(--emboss-ink, #1f2937);
}

/* ─── Drag reorder ─────────────────────────────────────────────────────── */

.emboss-sidebar-cell.emboss-sidebar-dragging {
  pointer-events: none;
  cursor: grabbing;
}
.emboss-sidebar-cell.emboss-sidebar-dragging > * {
  visibility: hidden;
}
.emboss-sidebar-cell.emboss-sidebar-dragging::after {
  content: '';
  position: absolute;
  inset: 4px 8px;
  border: 1.5px dashed var(--emboss-ink-5);
  border-radius: 4px;
}
.emboss-drag-ghost {
  opacity: 0.85;
  background: var(--emboss-surface);
  border: 1.5px solid var(--emboss-ink-3);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transform: scale(1.02);
  display: flex;
  align-items: center;
  cursor: grabbing;
}
.emboss-vivid .emboss-drag-ghost {
  border-color: #3b82f6;
}
.emboss-drop-indicator {
  position: absolute;
  left: 8px;
  right: 8px;
  height: 2px;
  background: var(--emboss-ink-3);
  pointer-events: none;
  z-index: 30;
  border-radius: 1px;
  transform: translateY(-50%);
}
.emboss-vivid .emboss-drop-indicator {
  background: #3b82f6;
}
.emboss-drop-indicator::before,
.emboss-drop-indicator::after {
  content: '';
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--emboss-ink-3);
  top: -2px;
}
.emboss-vivid .emboss-drop-indicator::before,
.emboss-vivid .emboss-drop-indicator::after {
  background: #3b82f6;
}
.emboss-drop-indicator::before { left: -3px; }
.emboss-drop-indicator::after { right: -3px; }

/* ─── Dense mode sidebar ───────────────────────────────────────────────── */

.emboss-dense.emboss-has-sidebar {
  grid-template-columns: var(--emboss-sidebar-w, 220px) 1fr;
}
.emboss-dense .emboss-sidebar-phase-name { font-size: 12px; }
.emboss-dense .emboss-sidebar-name { font-size: 11px; }
.emboss-dense .emboss-avatar { width: 18px; height: 18px; }
.emboss-dense .emboss-avatar-initials { font-size: 8px; }
/* Zebra stripe the sidebar cells to match grid */
.emboss-dense .emboss-sidebar-cell:nth-child(even) {
  background: var(--emboss-surface-2);
}

/* ─── Presentation mode sidebar ────────────────────────────────────────── */

.emboss-presentation.emboss-has-sidebar {
  grid-template-columns: var(--emboss-sidebar-w, 320px) 1fr;
}
.emboss-presentation .emboss-sidebar-phase-name { font-size: 14px; font-weight: 700; }
.emboss-presentation .emboss-sidebar-name { font-size: 13px; }
.emboss-presentation .emboss-avatar { width: 26px; height: 26px; }
.emboss-presentation .emboss-avatar-initials { font-size: 11px; }
.emboss-presentation .emboss-sidebar-cell { padding-right: 16px; }
/* Hide delete buttons — view only */
.emboss-presentation .emboss-sidebar-delete { display: none; }
/* Hide add button */
.emboss-presentation .emboss-sidebar-add-btn { display: none; }

/* ─── Avatars ──────────────────────────────────────────────────────────── */

.emboss-avatar {
  position: relative;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--emboss-ink-3);
}
.emboss-avatar-sm {
  width: 18px;
  height: 18px;
}
.emboss-avatar-initials {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.4), 0 0 4px rgba(0,0,0,0.2);
  letter-spacing: 0.5px;
}
.emboss-avatar-sm .emboss-avatar-initials {
  font-size: 8px;
}
/* Glass highlight on avatar */
.emboss-avatar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  border-radius: 50% 50% 0 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%);
  pointer-events: none;
}

/* ─── Collapse button ──────────────────────────────────────────────────── */

.emboss-sidebar-collapse {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--emboss-ink-4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
  transition: background 0.15s;
}
.emboss-sidebar-collapse:hover {
  background: var(--emboss-surface-2);
  color: var(--emboss-ink-2);
}

/* ─── Sidebar rail mode (collapsed) ───────────────────────────────────── */

.emboss.emboss-has-sidebar {
  transition: grid-template-columns 0.2s ease;
}
.emboss-sidebar {
  transition: width 0.2s ease;
}

.emboss-sidebar-collapsed.emboss-has-sidebar {
  grid-template-columns: 48px 1fr;
}
.emboss-sidebar-collapsed .emboss-sidebar-header-label,
.emboss-sidebar-collapsed .emboss-sidebar-add-btn { display: none; }
.emboss-sidebar-collapsed .emboss-sidebar { width: 48px; }
.emboss-sidebar-collapsed .emboss-sidebar-header { padding: 0; justify-content: center; }
.emboss-sidebar-collapsed .emboss-sidebar-header-area { flex: none; }

/* Rail cells: center content, no padding */
.emboss-sidebar-rail-cell {
  justify-content: center;
  padding: 0 !important;
  gap: 0;
}

/* Rail phase pill — 30×30 rounded square with first letter */
.emboss-rail-pill {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 13px;
  background: var(--emboss-ink-3);
  flex-shrink: 0;
}

/* Rail milestone diamond: 8×8 */
.emboss-sidebar-rail-cell .emboss-sidebar-diamond {
  width: 8px;
  height: 8px;
}

/* Dense mode rail — 36px, smaller pills */
.emboss-sidebar-collapsed.emboss-dense.emboss-has-sidebar {
  grid-template-columns: 36px 1fr;
}
.emboss-sidebar-collapsed.emboss-dense .emboss-sidebar { width: 36px; }
.emboss-sidebar-collapsed.emboss-dense .emboss-rail-pill {
  width: 24px;
  height: 24px;
  font-size: 11px;
  border-radius: 6px;
}

/* Presentation mode rail — 48px */
.emboss-sidebar-collapsed.emboss-presentation.emboss-has-sidebar {
  grid-template-columns: 48px 1fr;
}
.emboss-sidebar-collapsed.emboss-presentation .emboss-sidebar { width: 48px; }

/* ─── Inline timeline phases (rail mode) ───────────────────────────────── */

.emboss-inline-phase {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 12px;
  position: absolute;
  left: 0;
  z-index: 5;
  pointer-events: auto;
}

.emboss-inline-chevron {
  font-size: 10px;
  color: var(--emboss-ink-4);
  cursor: pointer;
  width: 16px;
  text-align: center;
  user-select: none;
}
.emboss-inline-chevron:hover {
  color: var(--emboss-ink-2);
}

.emboss-inline-phase-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--emboss-ink-2);
  white-space: nowrap;
  pointer-events: none;
}
.emboss-dark .emboss-inline-phase-name {
  color: var(--emboss-ink);
}

.emboss-inline-phase-count {
  font-size: 11px;
  color: var(--emboss-ink-4);
  background: var(--emboss-surface-2);
  padding: 1px 6px;
  border-radius: 8px;
  pointer-events: none;
}

/* Dense: smaller inline phase labels, no count badge */
.emboss-dense .emboss-inline-phase-name { font-size: 11px; }
.emboss-dense .emboss-inline-chevron { font-size: 8px; }
`,
}
