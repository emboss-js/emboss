/**
 * @emboss/core — renderers/grid.ts
 * CONTRACT: Section 10 Phase 2 (grid lines, weekend markers)
 *
 * Renders vertical grid lines and weekend shading.
 * Day: every day faint, weekends shaded
 * Week: lines every 7 days, weekends shaded
 * Month/Quarter: month boundaries only, weekends shaded
 * Horizontal row separator lines.
 */

import type { Scale, EmbossState } from '../types'
import { addDays, isWeekend } from '../dates'

export function renderGrid(scale: Scale, state: EmbossState, visibleRowCount: number): HTMLElement {
  const el = document.createElement('div')
  el.className = 'emboss-grid-inner'
  const totalWidth = scale.totalDays * scale.dayWidth
  const totalHeight = visibleRowCount * scale.rowHeight

  // Vertical lines + weekend shading
  for (let d = 0; d < scale.totalDays; d++) {
    const date = addDays(scale.startDate, d)
    const x = d * scale.dayWidth
    const weekend = isWeekend(date)

    // Weekend shading — full-height background stripe
    if (weekend && state.settings.markWeekends) {
      const shade = document.createElement('div')
      shade.className = 'emboss-grid-weekend'
      shade.style.cssText = `left:${x}px;width:${scale.dayWidth}px;height:${totalHeight}px;`
      el.appendChild(shade)
    }

    // Vertical lines based on view
    let showLine = false
    let isBoundary = false

    if (state.view === 'day') {
      showLine = true
    } else if (state.view === 'week') {
      showLine = date.getDay() === 1 // Monday boundaries
    } else {
      showLine = date.getDate() === 1 // Month boundaries
    }

    // Friday→Saturday boundary when weekends are marked
    if (state.settings.markWeekends && date.getDay() === 6 && d > 0) {
      isBoundary = true
    }

    if ((showLine || isBoundary) && d > 0) {
      const line = document.createElement('div')
      line.className = 'emboss-grid-vline'
      if (isBoundary && !showLine) line.classList.add('emboss-grid-vline-boundary')
      line.style.cssText = `left:${x}px;height:${totalHeight}px;`
      el.appendChild(line)
    }
  }

  // Horizontal row lines + zebra striping (dense mode)
  const isDense = state.density === 'dense'
  for (let i = 0; i <= visibleRowCount; i++) {
    // Zebra stripe on even rows
    if (isDense && i < visibleRowCount && i % 2 === 1) {
      const stripe = document.createElement('div')
      stripe.className = 'emboss-grid-stripe'
      stripe.style.cssText = `top:${i * scale.rowHeight}px;width:${totalWidth}px;height:${scale.rowHeight}px;`
      el.appendChild(stripe)
    }
    // Row separator line (skip top edge)
    if (i > 0) {
      const line = document.createElement('div')
      line.className = 'emboss-grid-hline'
      line.style.cssText = `top:${i * scale.rowHeight}px;width:${totalWidth}px;`
      el.appendChild(line)
    }
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
  background: rgba(0, 0, 0, 0.025);
  pointer-events: none;
}
.emboss-dark .emboss-grid-weekend {
  background: rgba(255, 255, 255, 0.025);
}
.emboss-grid-vline {
  position: absolute;
  top: 0;
  width: 1px;
  background: var(--emboss-ink);
  opacity: var(--emboss-grid-opacity);
}
.emboss-grid-vline-boundary {
  opacity: calc(var(--emboss-grid-opacity) * 1.5);
}
.emboss-grid-hline {
  position: absolute;
  left: 0;
  height: 1px;
  background: var(--emboss-ink);
  opacity: var(--emboss-grid-opacity);
}
/* Zebra stripe (dense mode) */
.emboss-grid-stripe {
  position: absolute;
  top: 0;
  background: rgba(0, 0, 0, 0.035);
  pointer-events: none;
}
.emboss-dark .emboss-grid-stripe {
  background: rgba(255, 255, 255, 0.04);
}
/* ─── Dense mode ──────────────────────────────────────────────────────── */
.emboss-dense .emboss-grid-vline { opacity: 0.02; }
.emboss-dense .emboss-grid-weekend { background: transparent; }
/* ─── Presentation mode ───────────────────────────────────────────────── */
.emboss-presentation .emboss-grid-vline { opacity: 0.015; }
.emboss-presentation .emboss-grid-hline { opacity: 0.04; }
.emboss-presentation .emboss-grid-weekend { opacity: 0.2; }
`;
