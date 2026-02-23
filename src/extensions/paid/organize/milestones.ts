/**
 * @emboss/core — extensions/paid/organize/milestones.ts
 * CONTRACT: Section 9.4 (milestone visual spec), Section 3.2 (BarRenderer for 'milestone')
 * BUNDLE: Organize ($79)
 *
 * 20×20px square rotated 45°, 3px radius corners
 * 2.5px border in phase color
 * Background: var(--emboss-surface)
 * Progress fill: bottom-to-top inside diamond
 * Glass highlight: top 50% white gradient
 * Hover: scale 1.2×
 * Done: 45% opacity
 */

import type { EmbossExtension } from '../../../core/types'

export const milestones: EmbossExtension = {
  name: 'milestones',
  type: 'paid',
  bundle: 'organize',

  barRenderer: {
    // TODO: Phase 5 — diamond milestone renderer
  },
}
