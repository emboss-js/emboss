/**
 * @emboss/core — extensions/paid/organize/sidebar.ts
 * CONTRACT: Section 3.1 (SidebarRenderer), Section 9.6 (sidebar visual spec)
 * BUNDLE: Organize ($79)
 *
 * Three states: full (var(--emboss-sidebar-w)) → rail (48px) → hidden
 * Full: task rows with status dot + name + assignee avatar (if Team ext)
 * Rail: phase pills (30×30px, centered letter), task dots (8×8px)
 * Collapse button: 24×24px, top-right of header, ◀ / ▶
 * Phase rows: chevron + colored pill + name + task count badge
 * Font: phase 13px/600, task 12.5px, milestone 12.5px italic
 *
 * Scroll syncs with chart via shared row index — NOT separate scroll listeners.
 */

import type { EmbossExtension } from '../../../core/types'

export const sidebar: EmbossExtension = {
  name: 'sidebar',
  type: 'paid',
  bundle: 'organize',

  sidebarRenderer: {
    // TODO: Phase 5 — implement per-row-type sidebar renderers
  },

  init(emboss) {
    // TODO: Phase 5 — create sidebar container, sync scroll, handle collapse clicks
  },

  styles: `
    .emboss-sidebar { width: var(--emboss-sidebar-w, 280px); border-right: 1px solid var(--emboss-border); overflow-y: auto; flex-shrink: 0; }
    .emboss-sidebar.rail { width: 48px; }
  `,
}
