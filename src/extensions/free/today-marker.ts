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

import type { EmbossExtension } from '../../core/types'

export const todayMarker: EmbossExtension = {
  name: 'today-marker',
  type: 'free',

  init(emboss) {
    // TODO: Phase 3 — position today line after each render
  },

  styles: `
    .emboss-today-col { position: absolute; top: 0; pointer-events: none; }
    .emboss-today-glow { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(var(--emboss-today-rgb, 239,68,68), 0.04), transparent); z-index: 1; }
    .emboss-today-line { position: absolute; top: 0; bottom: 0; left: 50%; width: 1.5px; background: var(--emboss-today); opacity: 0.5; transform: translateX(-50%); z-index: 20; }
    .emboss-today-dot { position: absolute; top: -3px; left: 50%; width: 8px; height: 8px; background: var(--emboss-today); border-radius: 50%; transform: translate(-50%, -50%); z-index: 25; }
    .emboss-today-ring { position: absolute; top: -3px; left: 50%; width: 16px; height: 16px; border-radius: 50%; background: rgba(var(--emboss-today-rgb, 239,68,68), 0.15); z-index: 24; animation: emboss-pulse 2s ease-in-out infinite; }
    .emboss-today-label { position: absolute; top: -17px; left: 50%; transform: translateX(-50%); font-size: 8px; font-weight: 700; color: var(--emboss-today); letter-spacing: 0.6px; text-transform: uppercase; font-family: monospace; z-index: 25; }
    @keyframes emboss-pulse { 0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.15; } 50% { transform: translate(-50%, -50%) scale(1.6); opacity: 0.05; } }
  `,
}
