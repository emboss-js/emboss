/**
 * @emboss/core — extensions/paid/organize/inline-edit.ts
 * CONTRACT: Section 6.3 (inline editing spec)
 * BUNDLE: Organize ($79)
 *
 * Click phase name → text input
 * Border: 1px solid {phaseColor} (matches phase, not always blue)
 * Focus ring: 0 0 0 3px {phaseColor at 12% opacity}
 * Border radius: 6px
 * Font: same as phase name (13px, weight 600)
 * Save: Enter or blur
 * Cancel: Escape → restores original
 */

import type { EmbossExtension } from '../../../core/types'

export const inlineEdit: EmbossExtension = {
  name: 'inline-edit',
  type: 'paid',
  bundle: 'organize',

  init(emboss) {
    // TODO: Phase 5 — wire click-to-edit on sidebar phase names
  },
}
