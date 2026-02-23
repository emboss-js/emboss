/**
 * @emboss/core — extensions/free/tooltips.ts
 * CONTRACT: Section 6.4 of product spec (tooltip visual spec), Section 5 (extension shape)
 *
 * Dark card: var(--emboss-ink) bg, 10px radius, 14px 16px padding, 240px width
 * Content: phase name, task name, status dot, date range, owner, progress bar, deps
 * Position: 16px below cursor, 8px right, follows mouse, boundary detection
 * Timing: 200ms appear delay, 0.15s fade in, 80ms fade-out delay
 * z-index: 1000, pointer-events: none
 * Dark mode: inverts (light bg, dark text)
 */

import type { EmbossExtension } from '../../core/types'

export const tooltips: EmbossExtension = {
  name: 'tooltips',
  type: 'free',

  init(emboss) {
    // TODO: Phase 3 — create tooltip element, wire hover events
  },

  styles: `
    .emboss-tip { position: fixed; z-index: 1000; pointer-events: none; background: var(--emboss-ink); color: white; border-radius: 10px; padding: 10px 14px; font-size: 11px; line-height: 1.5; box-shadow: 0 4px 20px rgba(0,0,0,0.2); max-width: 240px; opacity: 0; transform: translateY(4px); transition: opacity 0.15s, transform 0.15s; }
    .emboss-tip.show { opacity: 1; transform: translateY(0); }
    .emboss-dark .emboss-tip { background: var(--emboss-surface); color: var(--emboss-ink); }
  `,
}
