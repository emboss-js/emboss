/**
 * @emboss-js/core — extensions/paid/organize/phases.ts
 * CONTRACT: Section 3.2 (phase bar renderer), Section 1 (Row type 'phase')
 * BUNDLE: Organize ($79)
 *
 * Phase bar: 5px height, spans earliest child start → latest child end
 * Phase color at 25% opacity. No interaction (pointer-events: none).
 * Collapse logic: toggleCollapse sets collapsed[phaseId], recalcHidden hides children.
 */

import type { EmbossExtension } from '../../../core/types'

export const phases: EmbossExtension = {
  name: 'phases',
  type: 'paid',
  bundle: 'organize',

  barRenderer: {
    // TODO: Phase 5 — thin phase bar renderer
  },

  init(emboss) {
    // TODO: Phase 5 — derive phase date ranges from children
  },
}
