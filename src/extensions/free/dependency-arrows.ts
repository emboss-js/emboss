/**
 * @emboss/core — extensions/free/dependency-arrows.ts
 * CONTRACT: Section 7 (dependency arrows)
 *
 * SVG overlay, z-index 15. HIDDEN by default, shown on bar hover.
 *
 * Routing: start-to-start (left edge → left edge)
 * Path: horizontal left to gutter, vertical to target row, horizontal right to target start.
 * Right-angle routing with rounded joins.
 *
 * Status styling:
 * - Active (source done/active, target active): solid 1.5px, var(--emboss-ink-3), opacity 0.65
 * - Future (target upcoming): dashed (5 3), var(--emboss-ink-4), opacity 0.5
 * - Completed (both done): solid 1.2px, var(--emboss-ink-5), opacity 0.4
 *
 * Connection dots: 2.5px radius at each endpoint, same color/opacity
 *
 * Hover: all paths/dots render opacity:0. When hoveredRow matches data-f or data-t, add .hi class.
 * CSS: svg.emboss-dep path.hi, svg.emboss-dep circle.hi { opacity: 1 }
 * Transition: opacity 0.2s
 */

import type { EmbossExtension } from '../../core/types'

export const dependencyArrows: EmbossExtension = {
  name: 'dependency-arrows',
  type: 'free',

  init(emboss) {
    // TODO: Phase 3 — render SVG arrows, wire hover state
  },

  styles: `
    svg.emboss-dep { position: absolute; top: 0; left: 0; pointer-events: none; z-index: 15; overflow: visible; }
    svg.emboss-dep path, svg.emboss-dep circle { opacity: 0; transition: opacity 0.2s; }
    svg.emboss-dep path.hi, svg.emboss-dep circle.hi { opacity: 1; }
  `,
}
