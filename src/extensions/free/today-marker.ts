/**
 * @emboss/core — extensions/free/today-marker.ts
 * CONTRACT: Section 9.3 (today marker visual spec), Section 5 (extension shape)
 *
 * Line: 1.5px, var(--emboss-today), opacity 0.5, z-index 20
 * Dot: 8px circle, solid, centered on line top, z-index 25
 * Ring: 16px, 15% opacity, pulses scale(1)→scale(1.6) over 2s infinite
 * Glow: ~40px column, 4% opacity, z-index 1
 * Label: "TODAY" monospace, 8px, above dot
 */

import type { EmbossExtension, Scale, EmbossState } from '../../core/types'
import { daysBetween } from '../../core/dates'

export const todayMarker: EmbossExtension = {
  name: 'today-marker',
  type: 'free',

  init(emboss) {
    let col: HTMLElement | null = null

    emboss.on('afterRender', (container: HTMLElement, scale: Scale, _state: EmbossState) => {
      const body = container.querySelector('.emboss-body') as HTMLElement | null
      if (!body) return

      const todayOffset = daysBetween(scale.startDate, new Date())
      const x = todayOffset * scale.dayWidth

      // Skip if today is outside visible range
      if (todayOffset < 0 || todayOffset > scale.totalDays) {
        if (col) { col.remove(); col = null }
        return
      }

      // Create once, reposition on each render
      if (!col) {
        col = document.createElement('div')
        col.className = 'emboss-today-col'
        col.innerHTML = `
          <div class="emboss-today-glow"></div>
          <div class="emboss-today-line"></div>
          <div class="emboss-today-ring"></div>
          <div class="emboss-today-dot"></div>
          <div class="emboss-today-label">Today</div>
        `
      }

      // Position and size
      col.style.cssText = `left:${x - 20}px;width:40px;height:${body.scrollHeight}px;`

      // Ensure it's in the DOM
      if (!col.parentElement || col.parentElement !== body) {
        body.appendChild(col)
      }
    })
  },

  styles: `
    .emboss-today-col { position: absolute; top: 0; pointer-events: none; }
    .emboss-today-glow { position: absolute; top: 0; bottom: 0; left: 0; right: 0; background-color: var(--emboss-today, #ef4444); opacity: 0.02; z-index: 0; }
    .emboss-today-line { position: absolute; top: 0; bottom: 0; left: 50%; width: 1.5px; background-color: var(--emboss-today, #ef4444); opacity: 0.5; transform: translateX(-50%); z-index: 20; }
    .emboss-today-dot { position: absolute; top: 6px; left: 50%; width: 8px; height: 8px; background-color: var(--emboss-today, #ef4444); border-radius: 50%; transform: translate(-50%, -50%); z-index: 25; }
    .emboss-today-ring { position: absolute; top: 6px; left: 50%; width: 16px; height: 16px; border-radius: 50%; background-color: rgba(239,68,68, 0.15); z-index: 24; animation: emboss-pulse 2s ease-in-out infinite; transform: translate(-50%, -50%); }
    .emboss-today-label { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); font-size: 8px; font-weight: 700; color: var(--emboss-today, #ef4444); letter-spacing: 0.6px; text-transform: uppercase; font-family: monospace; z-index: 25; white-space: nowrap; }
    .emboss-dark .emboss-today-line { background-color: var(--emboss-today, #f87171); }
    .emboss-dark .emboss-today-dot { background-color: var(--emboss-today, #f87171); }
    .emboss-dark .emboss-today-glow { background-color: var(--emboss-today, #f87171); }
    .emboss-dark .emboss-today-label { color: var(--emboss-today, #f87171); }
    @keyframes emboss-pulse { 0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.15; } 50% { transform: translate(-50%, -50%) scale(1.6); opacity: 0.05; } }
    /* Dense mode: simplified today marker — just thin line + small dot */
    .emboss-dense .emboss-today-ring { display: none !important; }
    .emboss-dense .emboss-today-label { display: none !important; }
    .emboss-dense .emboss-today-glow { display: none; }
    .emboss-dense .emboss-today-dot { width: 6px; height: 6px; }
    .emboss-dense .emboss-today-line { width: 1px; }
    /* Presentation mode: more prominent */
    .emboss-presentation .emboss-today-line { width: 2px; }
    .emboss-presentation .emboss-today-dot { width: 10px; height: 10px; }
    .emboss-presentation .emboss-today-ring { width: 20px; height: 20px; }
    .emboss-presentation .emboss-today-label { font-size: 9px; }
  `,
}
