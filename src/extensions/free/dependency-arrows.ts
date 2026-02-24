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
 * Hover: all paths render opacity:0. When hoveredRow matches, set inline opacity.
 * No endpoint circles — paths only, keeps labels clean.
 * Transition: opacity 0.2s
 */

import type { EmbossExtension, Row, Scale, EmbossState } from '../../core/types'

interface ArrowStyle {
  stroke: string
  width: number
  dash: string
  opacity: number
}

function getArrowStyle(source: Row, target: Row): ArrowStyle {
  if (source.status === 'done' && target.status === 'done') {
    return { stroke: 'var(--emboss-ink-5)', width: 1.2, dash: '', opacity: 0.4 }
  }
  if (target.status === 'upcoming') {
    return { stroke: 'var(--emboss-ink-4)', width: 1.5, dash: '5 3', opacity: 0.5 }
  }
  return { stroke: 'var(--emboss-ink-3)', width: 1.5, dash: '', opacity: 0.65 }
}

const SVG_NS = 'http://www.w3.org/2000/svg'

export const dependencyArrows: EmbossExtension = {
  name: 'dependency-arrows',
  type: 'free',

  init(emboss) {
    let svg: SVGSVGElement | null = null

    emboss.on('afterRender', (container: HTMLElement, scale: Scale, state: EmbossState) => {
      const body = container.querySelector('.emboss-body') as HTMLElement | null
      if (!body) return

      const visibleRows = state.rows.filter(r => !r.hidden)
      const rowIndex = new Map<string, number>()
      visibleRows.forEach((r, i) => rowIndex.set(r.id, i))

      // Create or reuse SVG
      if (!svg) {
        svg = document.createElementNS(SVG_NS, 'svg')
        svg.classList.add('emboss-dep')
      }
      svg.setAttribute('width', String(scale.totalDays * scale.dayWidth))
      svg.setAttribute('height', String(visibleRows.length * scale.rowHeight))
      svg.innerHTML = ''

      // Build arrows
      const gutter = 12 // horizontal gutter offset for routing
      const r = 4 // rounded corner radius

      for (const target of visibleRows) {
        if (!target.dependencies || target.dependencies.length === 0) continue
        const tIdx = rowIndex.get(target.id)
        if (tIdx === undefined) continue

        for (const depId of target.dependencies) {
          const sIdx = rowIndex.get(depId)
          if (sIdx === undefined) continue
          const source = visibleRows[sIdx]

          // Start-to-start: left edge of source → left edge of target
          const sx = source.start * scale.dayWidth
          const sy = sIdx * scale.rowHeight + scale.rowHeight / 2
          const tx = target.start * scale.dayWidth
          const ty = tIdx * scale.rowHeight + scale.rowHeight / 2

          // Route: go left to gutter, then vertical, then right to target
          const gutterX = Math.min(sx, tx) - gutter
          const style = getArrowStyle(source, target)

          // Build path with rounded corners
          const path = buildPath(sx, sy, tx, ty, gutterX, r)

          const pathEl = document.createElementNS(SVG_NS, 'path')
          pathEl.setAttribute('d', path)
          pathEl.setAttribute('fill', 'none')
          pathEl.setAttribute('stroke', style.stroke)
          pathEl.setAttribute('stroke-width', String(style.width))
          pathEl.setAttribute('stroke-linecap', 'round')
          pathEl.setAttribute('stroke-linejoin', 'round')
          if (style.dash) pathEl.setAttribute('stroke-dasharray', style.dash)
          pathEl.dataset.f = source.id
          pathEl.dataset.t = target.id
          pathEl.dataset.depOpacity = String(style.opacity)
          pathEl.style.opacity = '0'
          svg.appendChild(pathEl)
        }
      }

      // Ensure SVG is in the DOM
      if (!svg.parentElement || svg.parentElement !== body) {
        body.appendChild(svg)
      }

      // Apply hover highlighting
      applyHover(svg, state.hoveredRow)
    })

    // Update highlights on hover without full re-render
    emboss.on('onHover', (_row: Row | null) => {
      if (svg) applyHover(svg, emboss.state.hoveredRow)
    })
  },

  styles: `
    svg.emboss-dep { position: absolute; top: 0; left: 0; pointer-events: none; z-index: 15; overflow: visible; }
    svg.emboss-dep path { transition: opacity 0.2s; }
  `,
}

function applyHover(svg: SVGSVGElement, hoveredRow: string | null): void {
  const els = svg.querySelectorAll('path')
  for (const el of els) {
    const ds = (el as SVGElement).dataset
    if (hoveredRow && (ds.f === hoveredRow || ds.t === hoveredRow)) {
      ;(el as SVGElement).style.opacity = ds.depOpacity || '0.65'
    } else {
      ;(el as SVGElement).style.opacity = '0'
    }
  }
}

function buildPath(
  sx: number, sy: number,
  tx: number, ty: number,
  gutterX: number,
  r: number,
): string {
  // Start-to-start routing: source left edge → gutter → vertical → target left edge
  // All right-angle with rounded corners

  if (Math.abs(sy - ty) < 1) {
    // Same row — horizontal line through gutter
    return `M ${sx} ${sy} H ${gutterX} H ${tx}`
  }

  const goingDown = ty > sy
  const midY = goingDown ? ty : ty

  // Clamp radius to available space
  const availH = Math.abs(sx - gutterX)
  const availV = Math.abs(ty - sy)
  const cr = Math.min(r, availH, availV / 2)

  // Path segments:
  // 1. Horizontal from source to gutter (with rounded turn into vertical)
  // 2. Vertical from source row to target row (with rounded turn into horizontal)
  // 3. Horizontal from gutter to target

  const d = goingDown ? 1 : -1

  return [
    `M ${sx} ${sy}`,
    `H ${gutterX + cr}`,
    `Q ${gutterX} ${sy} ${gutterX} ${sy + d * cr}`,
    `V ${ty - d * cr}`,
    `Q ${gutterX} ${ty} ${gutterX + cr} ${ty}`,
    `H ${tx}`,
  ].join(' ')
}
