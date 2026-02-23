/**
 * @emboss/core — renderers/bar.ts
 * CONTRACT: Section 3.2 (BarRenderer), Section 9.1 (glass bar), 9.2 (labels), 9.5 (drag handles)
 *
 * Renders the glass track/fill/marker bar for type 'task' and 'subtask'.
 * Renders thin phase bar for type 'phase'.
 * Milestone rendering is in extensions/paid/organize/milestones.ts.
 *
 * Track: full width, --emboss-track
 * Fill: progress width, status gradient, glass highlight (::before), shadow (::after)
 * Marker dot: 12px white circle at fill edge, hidden at 0% and 100%
 * Labels: inside if bar > 70px, outside otherwise
 * Handles: inset 4px, visible on hover, hidden in presentation density
 */

// TODO: Phase 2 — implement glass bar rendering
