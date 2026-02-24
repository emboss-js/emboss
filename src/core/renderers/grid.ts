/**
 * @emboss/core — renderers/grid.ts
 * CONTRACT: Section 10 Phase 2 (grid lines, weekend markers)
 *
 * Renders vertical grid lines and weekend shading.
 * Day: every day faint, weekends heavier
 * Week: lines every 7 days
 * Month/Quarter: month boundaries only
 * Horizontal row separator lines.
 */

import type { Scale, EmbossState } from '../types'
import { addDays, isWeekend } from '../dates'

export function renderGrid(scale: Scale, state: EmbossState, visibleRowCount: number): HTMLElement {
  const el = document.createElement('div')
  el.className = 'emboss-grid-inner'
  const totalWidth = scale.totalDays * scale.dayWidth
  const totalHeight = visibleRowCount * scale.rowHeight

  // Vertical lines
  for (let d = 0; d < scale.totalDays; d++) {
    const date = addDays(scale.startDate, d)
    const x = d * scale.dayWidth
    const weekend = isWeekend(date)

    // Weekend shading
    if (weekend && state.settings.markWeekends) {
      const shade = document.createElement('div')
      shade.className = 'emboss-grid-weekend'
      shade.style.cssText = `left:${x}px;width:${scale.dayWidth}px;height:${totalHeight}px;`
      el.appendChild(shade)
    }

    // Vertical lines based on view
    let showLine = false
    if (state.view === 'day') {
      showLine = true
    } else if (state.view === 'week') {
      showLine = date.getDay() === 1 // Monday boundaries
    } else {
      showLine = date.getDate() === 1 // Month boundaries
    }

    if (showLine && d > 0) {
      const line = document.createElement('div')
      line.className = 'emboss-grid-vline'
      if (state.view === 'day' && weekend) line.classList.add('emboss-grid-vline-weekend')
      line.style.cssText = `left:${x}px;height:${totalHeight}px;`
      el.appendChild(line)
    }
  }

  // Horizontal row lines
  for (let i = 1; i <= visibleRowCount; i++) {
    const line = document.createElement('div')
    line.className = 'emboss-grid-hline'
    line.style.cssText = `top:${i * scale.rowHeight}px;width:${totalWidth}px;`
    el.appendChild(line)
  }

  return el
}

export const GRID_STYLES = `
.emboss-grid {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 0;
}
.emboss-grid-inner {
  position: relative;
}
.emboss-grid-weekend {
  position: absolute;
  top: 0;
  background: var(--emboss-ink);
  opacity: var(--emboss-grid-opacity);
}
.emboss-grid-vline {
  position: absolute;
  top: 0;
  width: 1px;
  background: var(--emboss-ink);
  opacity: var(--emboss-grid-opacity);
}
.emboss-grid-vline-weekend {
  opacity: calc(var(--emboss-grid-opacity) * 0.6);
}
.emboss-grid-hline {
  position: absolute;
  left: 0;
  height: 1px;
  background: var(--emboss-ink);
  opacity: var(--emboss-grid-opacity);
}
`;
