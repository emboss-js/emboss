/**
 * @emboss/core — drag.ts
 * CONTRACT: Section 4 (drag events), Section 8 (Frappe mapping — KEEP drag handling)
 *
 * Mousedown/mousemove/mouseup lifecycle for bar dragging.
 * Emits events through the Emboss instance, never mutates state directly.
 *
 * Four drag types: move (whole bar), resize-left, resize-right, progress.
 * Ghost bar shown at new position during drag.
 *
 * moveDependencies: when enabled and drag type is 'move', all transitive
 * dependents move together with the dragged bar (ported from Frappe Gantt).
 */

import type { Row, EmbossState, RowUpdate } from './types'
import { xToDay } from './dates'

type DragType = 'move' | 'resize-left' | 'resize-right' | 'progress'

interface DragCallbacks {
  emit(event: string, ...args: any[]): void | false
  updateRow(rowId: string, changes: Partial<Row>): void
  getState(): EmbossState
}

/** Walk dependency graph: returns all rows that transitively depend on taskId */
function getAllDependents(taskId: string, rows: Row[]): Row[] {
  // Build reverse map: for each row, which rows list it in their dependencies?
  const dependentsOf: Record<string, string[]> = {}
  for (const row of rows) {
    for (const depId of row.dependencies) {
      if (!dependentsOf[depId]) dependentsOf[depId] = []
      dependentsOf[depId].push(row.id)
    }
  }

  const visited = new Set<string>()
  const queue = [taskId]
  while (queue.length) {
    const id = queue.shift()!
    const deps = dependentsOf[id] || []
    for (const depId of deps) {
      if (!visited.has(depId)) {
        visited.add(depId)
        queue.push(depId)
      }
    }
  }

  return rows.filter(r => visited.has(r.id))
}

interface DepGhost {
  row: Row
  ghost: HTMLElement
  barEl: HTMLElement
  originalStart: number
}

export function initDrag(barsEl: HTMLElement, callbacks: DragCallbacks): () => void {
  let activeDrag: {
    row: Row
    type: DragType
    startX: number
    startY: number
    originalStart: number
    originalDuration: number
    originalProgress: number
    ghost: HTMLElement
    barEl: HTMLElement
    depGhosts: DepGhost[]
  } | null = null

  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return
    // No dragging in presentation mode
    if (callbacks.getState().density === 'presentation') return
    const target = e.target as HTMLElement

    // Determine drag type from target class
    let type: DragType
    if (target.classList.contains('emboss-bar-handle-left')) {
      type = 'resize-left'
    } else if (target.classList.contains('emboss-bar-handle-right')) {
      type = 'resize-right'
    } else if (target.classList.contains('emboss-bar-marker')) {
      type = 'progress'
    } else {
      type = 'move'
    }

    // Walk up to find .emboss-bar[data-id]
    const barEl = target.closest('.emboss-bar[data-id]') as HTMLElement | null
    if (!barEl) return

    const rowId = barEl.dataset.id!
    const state = callbacks.getState()
    const row = state.rows.find(r => r.id === rowId)
    if (!row || row.type === 'phase') return

    // Let extensions cancel
    const vetoed = callbacks.emit('onDragStart', row, type)
    if (vetoed === false) return

    // Create ghost
    const ghost = barEl.cloneNode(true) as HTMLElement
    ghost.classList.add('emboss-bar-ghost')
    barEl.style.opacity = '0.35'
    barEl.parentElement!.appendChild(ghost)

    // Collect dependent ghosts if moveDependencies is on and drag type is move
    const depGhosts: DepGhost[] = []
    if (type === 'move' && state.moveDependencies) {
      const dependents = getAllDependents(rowId, state.rows)
      for (const dep of dependents) {
        if (dep.type === 'phase') continue
        const depBarEl = barsEl.querySelector(`.emboss-bar[data-id="${dep.id}"]`) as HTMLElement | null
        if (!depBarEl) continue
        const depGhost = depBarEl.cloneNode(true) as HTMLElement
        depGhost.classList.add('emboss-bar-ghost')
        depBarEl.style.opacity = '0.35'
        depBarEl.parentElement!.appendChild(depGhost)
        depGhosts.push({ row: dep, ghost: depGhost, barEl: depBarEl, originalStart: dep.start })
      }
    }

    activeDrag = {
      row,
      type,
      startX: e.clientX,
      startY: e.clientY,
      originalStart: row.start,
      originalDuration: row.duration,
      originalProgress: row.progress,
      ghost,
      barEl,
      depGhosts,
    }

    e.preventDefault()
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  function onMouseMove(e: MouseEvent) {
    if (!activeDrag) return
    const { row, type, startX, ghost, originalStart, originalDuration, originalProgress } = activeDrag
    const state = callbacks.getState()
    const dayWidth = state.scale.dayWidth
    const dx = e.clientX - startX
    const dayDelta = xToDay(dx, dayWidth)

    if (type === 'move') {
      const newLeft = (originalStart + dayDelta) * dayWidth
      ghost.style.left = `${Math.max(0, newLeft)}px`
      // Move dependent ghosts by same delta
      for (const dg of activeDrag.depGhosts) {
        const depLeft = (dg.originalStart + dayDelta) * dayWidth
        dg.ghost.style.left = `${Math.max(0, depLeft)}px`
      }
      callbacks.emit('onDragMove', row, { days: dayDelta })
    } else if (type === 'resize-right') {
      const newDuration = Math.max(1, originalDuration + dayDelta)
      ghost.style.width = `${newDuration * dayWidth}px`
      callbacks.emit('onDragMove', row, { days: dayDelta })
    } else if (type === 'resize-left') {
      const newStart = originalStart + dayDelta
      const newDuration = originalDuration - dayDelta
      if (newDuration >= 1) {
        ghost.style.left = `${newStart * dayWidth}px`
        ghost.style.width = `${newDuration * dayWidth}px`
      }
      callbacks.emit('onDragMove', row, { days: dayDelta })
    } else if (type === 'progress') {
      const barWidth = originalDuration * dayWidth
      const newProgress = Math.max(0, Math.min(100, Math.round((dx / barWidth) * 100 + originalProgress)))
      // Move marker in ghost
      const marker = ghost.querySelector('.emboss-bar-marker') as HTMLElement | null
      const fill = ghost.querySelector('.emboss-bar-fill') as HTMLElement | null
      if (fill) fill.style.width = `${Math.max(14, barWidth * newProgress / 100)}px`
      if (marker) marker.style.left = `${Math.max(14, barWidth * newProgress / 100) - 6}px`
      callbacks.emit('onDragMove', row, { days: 0, progress: newProgress })
    }
  }

  function onMouseUp(e: MouseEvent) {
    if (!activeDrag) return
    const { row, type, startX, originalStart, originalDuration, originalProgress, ghost, barEl, depGhosts } = activeDrag
    const state = callbacks.getState()
    const dayWidth = state.scale.dayWidth
    const dx = e.clientX - startX
    const dayDelta = xToDay(dx, dayWidth)

    // Compute update
    const update: RowUpdate = {}
    if (type === 'move') {
      update.start = Math.max(0, originalStart + dayDelta)
    } else if (type === 'resize-right') {
      update.duration = Math.max(1, originalDuration + dayDelta)
    } else if (type === 'resize-left') {
      const newDuration = originalDuration - dayDelta
      if (newDuration >= 1) {
        update.start = originalStart + dayDelta
        update.duration = newDuration
      }
    } else if (type === 'progress') {
      const barWidth = originalDuration * dayWidth
      update.progress = Math.max(0, Math.min(100, Math.round((dx / barWidth) * 100 + originalProgress)))
    }

    // Let extensions veto
    const vetoed = callbacks.emit('onDragEnd', row, update)
    if (vetoed !== false && Object.keys(update).length > 0) {
      callbacks.updateRow(row.id, update)
      // Apply same day delta to all dependents
      if (type === 'move') {
        for (const dg of depGhosts) {
          callbacks.updateRow(dg.row.id, { start: Math.max(0, dg.originalStart + dayDelta) })
        }
      }
    }

    // Cleanup
    ghost.remove()
    barEl.style.opacity = ''
    for (const dg of depGhosts) {
      dg.ghost.remove()
      dg.barEl.style.opacity = ''
    }
    activeDrag = null
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  barsEl.addEventListener('mousedown', onMouseDown)

  return () => {
    barsEl.removeEventListener('mousedown', onMouseDown)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }
}

export const DRAG_STYLES = `
.emboss-bar-ghost {
  opacity: 0.7;
  pointer-events: none;
  z-index: 100;
}
`;
