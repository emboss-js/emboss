/**
 * @emboss/core — drag.ts
 * CONTRACT: Section 4 (drag events), Section 8 (Frappe mapping — KEEP drag handling)
 *
 * Mousedown/mousemove/mouseup lifecycle for bar dragging.
 * Emits events through the Emboss instance, never mutates state directly.
 *
 * Three drag types: move (whole bar), resize-left, resize-right, progress.
 * Ghost bar shown at new position during drag (Phase 2).
 */

// TODO: Phase 1 — port Frappe's drag handling
// TODO: Phase 2 — wire to Emboss event system, render ghost bars
