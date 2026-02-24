/**
 * @emboss/core — extensions/paid/organize/sidebar.ts
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

function statusColor(status: string): string {
  if (status === 'active') return 'var(--emboss-ink-3)'
  if (status === 'done') return 'var(--emboss-ink-4)'
  return 'var(--emboss-ink-5)'
}

const VIVID_SWATCHES = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#f97316',
]

const GRAYSCALE_SWATCHES = [
  '#374151', '#4b5563', '#6b7280', '#9ca3af',
  '#1f2937', '#525252', '#78716c', '#a3a3a3',
]

// ─── Cell renderers ─────────────────────────────────────────────────────────

function renderTaskCell(row: Row, state: EmbossState): HTMLElement {
  const el = document.createElement('div')
  el.className = 'emboss-sidebar-cell emboss-sidebar-task'
  el.dataset.id = row.id
  el.style.height = `${state.scale.rowHeight}px`
  el.style.paddingLeft = `${48 + row.depth * 16}px`

  const dot = document.createElement('span')
  dot.className = 'emboss-sidebar-dot'
  dot.style.background = statusColor(row.status)

  const name = document.createElement('span')
  name.className = 'emboss-sidebar-name'
  name.textContent = row.name

  const del = document.createElement('span')
  del.className = 'emboss-sidebar-delete'
  del.textContent = '\u00d7'

  el.appendChild(dot)
  el.appendChild(name)
  el.appendChild(del)
  return el
}

function renderPhaseCell(row: Row, state: EmbossState): HTMLElement {
  const collapsed = state.collapsed[row.id]
  const count = row.children ? row.children.length : 0
  const phaseIdx = state.rows.filter(r => r.type === 'phase').findIndex(r => r.id === row.id)
  const idx = phaseIdx >= 0 ? phaseIdx : 0
  const color = row.phaseColor || VIVID_SWATCHES[idx % VIVID_SWATCHES.length]

  const el = document.createElement('div')
  el.className = 'emboss-sidebar-cell emboss-sidebar-phase'
  el.dataset.id = row.id
  el.dataset.phaseIdx = String(idx % 5)
  el.style.height = `${state.scale.rowHeight}px`
  el.style.paddingLeft = `${16 + row.depth * 16}px`
  el.style.setProperty('--phase-c', color)
  if (row.phaseColor) el.dataset.colorSet = ''

  const chevron = document.createElement('span')
  chevron.className = 'emboss-sidebar-chevron'
  if (collapsed) chevron.classList.add('collapsed')

  const pill = document.createElement('span')
  pill.className = 'emboss-sidebar-pill'
  pill.dataset.phaseId = row.id

  const name = document.createElement('span')
  name.className = 'emboss-sidebar-name emboss-sidebar-phase-name'
  name.textContent = row.name

  const badge = document.createElement('span')
  badge.className = 'emboss-sidebar-badge'
  badge.textContent = String(count)

  const del = document.createElement('span')
  del.className = 'emboss-sidebar-delete'
  del.textContent = '\u00d7'

  el.appendChild(chevron)
  el.appendChild(pill)
  el.appendChild(name)
  el.appendChild(badge)
  el.appendChild(del)
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
  dot.style.background = statusColor(row.status)

  const name = document.createElement('span')
  name.className = 'emboss-sidebar-name'
  name.textContent = row.name

  const del = document.createElement('span')
  del.className = 'emboss-sidebar-delete'
  del.textContent = '\u00d7'

  el.appendChild(dot)
  el.appendChild(name)
  el.appendChild(del)
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

  const name = document.createElement('span')
  name.className = 'emboss-sidebar-name emboss-sidebar-milestone-name'
  name.textContent = row.name

  const del = document.createElement('span')
  del.className = 'emboss-sidebar-delete'
  del.textContent = '\u00d7'

  el.appendChild(diamond)
  el.appendChild(name)
  el.appendChild(del)
  return el
}

// ─── Renderer map ───────────────────────────────────────────────────────────

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

    // ── Popup state (managed outside render cycle) ──
    let addMenuEl: HTMLElement | null = null
    let colorPickerEl: HTMLElement | null = null
    let colorPickerPhaseId: string | null = null
    let editingRowId: string | null = null
    let isNewRow = false // true when editingRowId was just created via "+"
    let isDragging = false
    let containerRef: HTMLElement | null = null

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
        const lastChild = phase ? findLastChild(phase.id) : null
        emboss.addRow(newRow, lastChild || phase?.id)
      } else {
        const newRow: Row = {
          id, type: 'milestone', name: 'New Milestone', depth: phase ? 1 : 0,
          parentId: phase?.id || null, collapsed: false, hidden: false,
          start: phase ? phase.start + phase.duration : 0, duration: 0,
          progress: 0, status: 'upcoming', dependencies: [],
        }
        if (phase?.children) phase.children.push(id)
        const lastChild = phase ? findLastChild(phase.id) : null
        emboss.addRow(newRow, lastChild || phase?.id)
      }
    }

    function findLastChild(phaseId: string): string | null {
      const rows = emboss.state.rows
      let lastId: string | null = null
      for (const r of rows) {
        if (r.parentId === phaseId) lastId = r.id
      }
      return lastId
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

    // ── Open color picker ──
    function openColorPicker(pillEl: HTMLElement, phaseId: string) {
      if (colorPickerEl && colorPickerPhaseId === phaseId) {
        closeColorPicker()
        return
      }
      closeColorPicker()
      closeAddMenu()

      colorPickerPhaseId = phaseId
      const row = emboss.state.rows.find(r => r.id === phaseId)
      if (!row) return
      const currentColor = (row.phaseColor || '#6b7280').toLowerCase()
      const isVivid = containerRef?.classList.contains('emboss-vivid') ?? false
      const swatches = isVivid ? VIVID_SWATCHES : GRAYSCALE_SWATCHES

      colorPickerEl = document.createElement('div')
      colorPickerEl.className = 'emboss-color-picker'

      const grid = document.createElement('div')
      grid.className = 'emboss-color-grid'
      for (const c of swatches) {
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
          if (target.closest('.emboss-sidebar-add-btn')) {
            openAddMenu(target.closest('.emboss-sidebar-add-btn') as HTMLElement)
          }
        })

        // ── DELEGATED: body click (collapse, inline edit, delete) ──
        sidebarBodyEl.addEventListener('click', (e: MouseEvent) => {
          const target = e.target as HTMLElement

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

        function isValidDrop(dragging: Row, target: number, visible: Row[]): boolean {
          const cur = visible.indexOf(dragging)

          if (dragging.type === 'phase') {
            const groupEnd = getPhaseGroupEnd(cur, visible)
            if (target >= cur && target <= groupEnd) return false
            const next = visible[target]
            return !next || next.type === 'phase'
          }

          if (dragging.type === 'task' || dragging.type === 'milestone') {
            if (target === cur || target === cur + 1) return false
            return findPhaseForIdx(target, visible) !== null
          }

          if (dragging.type === 'subtask') {
            if (target === cur || target === cur + 1) return false
            const parent = visible.find(r => r.id === dragging.parentId)
            if (!parent) return false
            const pi = visible.indexOf(parent)
            const ns = visible.findIndex((r, i) => i > pi && r.depth <= parent.depth)
            return target > pi && target <= (ns === -1 ? visible.length : ns)
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

          // Re-parent task/milestone if it moved to a different phase
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

          emboss.emit('onRowReorder', id, adj)
          emboss.render()
        }

        function beginDrag(rowId: string) {
          isDragging = true
          draggedRowId = rowId
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
          const rh = emboss.state.scale.rowHeight

          let idx = Math.round(y / rh)
          idx = Math.max(0, Math.min(idx, visible.length))

          const dragging = emboss.state.rows.find(r => r.id === draggedRowId)
          if (!dragging) return

          if (isValidDrop(dragging, idx, visible)) {
            dropTargetIndex = idx
            dropIndicator!.style.display = 'block'
            dropIndicator!.style.top = `${idx * rh - 1}px`
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
          if (target.closest('.emboss-sidebar-delete, .emboss-sidebar-chevron, .emboss-sidebar-pill, .emboss-sidebar-name, .emboss-sidebar-edit-input')) return
          const cell = target.closest('.emboss-sidebar-cell[data-id]') as HTMLElement | null
          if (!cell?.dataset.id) return

          dragPendingRowId = cell.dataset.id
          dragStartY = e.clientY
          dragTimer = window.setTimeout(() => {
            dragTimer = null
            if (dragPendingRowId) beginDrag(dragPendingRowId)
          }, 150) as unknown as number
        })

        sidebarBodyEl.addEventListener('mousemove', (e: MouseEvent) => {
          if (dragTimer && dragPendingRowId && Math.abs(e.clientY - dragStartY) > 5) {
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
      const label = document.createElement('span')
      label.className = 'emboss-sidebar-header-label'
      label.textContent = 'Tasks'
      sidebarHeaderEl.appendChild(label)

      const addBtn = document.createElement('button')
      addBtn.className = 'emboss-sidebar-add-btn'
      addBtn.textContent = '+'
      sidebarHeaderEl.appendChild(addBtn)

      // ── Render cells ──
      // If user is actively typing in an input, don't destroy it
      const activeInput = sidebarBodyEl!.querySelector('.emboss-sidebar-edit-input')
      if (activeInput || isDragging) return

      const visibleRows = state.rows.filter(r => !r.hidden)
      const fragment = document.createDocumentFragment()
      for (const row of visibleRows) {
        const renderer = cellRenderers[row.type]
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
  cursor: grab;
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

/* Name */
.emboss-sidebar-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12.5px;
  color: var(--emboss-ink);
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

/* ─── Phase cell ────────────────────────────────────────────────────────── */

.emboss-sidebar-phase {
  cursor: grab;
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

/* Colored pill — gray in grayscale, vivid in vivid, user-picked overrides both */
.emboss-sidebar-pill {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  cursor: pointer;
  background: var(--phase-gray, var(--emboss-ink-3));
}
.emboss-vivid .emboss-sidebar-pill,
[data-color-set] .emboss-sidebar-pill {
  background: var(--phase-c);
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
  border: 1.5px solid var(--emboss-ink-3);
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
  border-color: var(--phase-gray, var(--emboss-ink-4)) !important;
}
.emboss-vivid .emboss-sidebar-edit-phase,
[data-color-set] .emboss-sidebar-edit-phase {
  border-color: var(--phase-c) !important;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
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
`,
}
