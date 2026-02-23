/**
 * @emboss/core — renderers/bar.ts
 * CONTRACT: Section 3.2 (BarRenderer), Section 9.1 (glass bar), 9.2 (labels), 9.5 (drag handles)
 *
 * Renders the glass track/fill/marker bar for type 'task' and 'subtask'.
 * Renders thin phase bar for type 'phase'.
 * Milestone rendering is in extensions/paid/organize/milestones.ts.
 */

import type { Row, Scale, EmbossState } from '../types'

export function renderBar(row: Row, scale: Scale, state: EmbossState): HTMLElement {
  if (row.type === 'phase') return renderPhaseBar(row, scale)
  return renderTaskBar(row, scale, state)
}

function renderTaskBar(row: Row, scale: Scale, state: EmbossState): HTMLElement {
  const left = row.start * scale.dayWidth
  const width = Math.max(row.duration * scale.dayWidth, scale.barHeight)
  const barTop = Math.round((scale.rowHeight - scale.barHeight) / 2)
  const r = scale.barRadius

  const bar = document.createElement('div')
  bar.className = 'emboss-bar'
  bar.dataset.id = row.id
  bar.dataset.status = row.status
  bar.dataset.type = row.type
  bar.style.cssText = `left:${left}px;width:${width}px;top:${barTop}px;height:${scale.barHeight}px;border-radius:${r}px;`

  // Track — pill-shaped container behind fill
  const track = document.createElement('div')
  track.className = 'emboss-bar-track'
  bar.appendChild(track)

  // Fill
  const progress = Math.max(0, Math.min(100, row.progress))
  const isUpcoming0 = row.status === 'upcoming' && progress === 0
  const fillWidth = isUpcoming0
    ? width // upcoming 0%: fill covers full width at reduced opacity
    : Math.max(progress > 0 ? 14 : 0, width * progress / 100)

  // Fill radius: left-rounded only when partial, full at 100%
  const fillRadius = progress >= 100 || isUpcoming0
    ? `${r}px`
    : `${r}px 0 0 ${r}px`

  const fill = document.createElement('div')
  fill.className = 'emboss-bar-fill'
  fill.style.cssText = `width:${fillWidth}px;border-radius:${fillRadius};`
  bar.appendChild(fill)

  // Progress marker dot (hidden at 0% and 100%)
  if (progress > 0 && progress < 100) {
    const marker = document.createElement('div')
    marker.className = 'emboss-bar-marker'
    marker.style.left = `${fillWidth - 6}px`
    bar.appendChild(marker)
  }

  // Label — child of bar (not fill) to avoid clipping
  const label = document.createElement('div')
  label.className = 'emboss-bar-label'
  label.style.cssText = `font-size:${scale.labelSize}px;height:${scale.barHeight}px;line-height:${scale.barHeight}px;`
  const progressText = progress > 0 && progress < 100 ? ` ${progress}%` : ''
  label.textContent = row.name + progressText

  if (width <= 70) {
    label.classList.add('emboss-bar-label-outside')
  } else {
    label.classList.add('emboss-bar-label-inside')
    if (isUpcoming0) label.classList.add('emboss-bar-label-upcoming')
  }
  bar.appendChild(label)

  // Drag handles (hidden in presentation density)
  if (state.density !== 'presentation') {
    const handleL = document.createElement('div')
    handleL.className = 'emboss-bar-handle emboss-bar-handle-left'
    bar.appendChild(handleL)

    const handleR = document.createElement('div')
    handleR.className = 'emboss-bar-handle emboss-bar-handle-right'
    bar.appendChild(handleR)
  }

  return bar
}

function renderPhaseBar(row: Row, scale: Scale): HTMLElement {
  const left = row.start * scale.dayWidth
  const width = Math.max(row.duration * scale.dayWidth, 20)
  const barTop = Math.round((scale.rowHeight - 8) / 2)

  const bar = document.createElement('div')
  bar.className = 'emboss-bar emboss-bar-phase'
  bar.dataset.id = row.id
  bar.dataset.type = 'phase'
  bar.style.cssText = `left:${left}px;width:${width}px;top:${barTop}px;height:8px;border-radius:4px;`

  // Phase label — below the thin bar
  const label = document.createElement('div')
  label.className = 'emboss-bar-label emboss-bar-label-phase'
  label.style.fontSize = `${scale.labelSize}px`
  label.textContent = row.name
  bar.appendChild(label)

  return bar
}

export const BAR_STYLES = `
.emboss-bar {
  position: absolute;
  cursor: pointer;
  user-select: none;
}

/* Track — pill-shaped container behind fill, inherits bar's border-radius */
.emboss-bar-track {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background-color: var(--emboss-track, #c0c9d4);
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.06);
}
.emboss-dark .emboss-bar-track {
  box-shadow: none;
}

.emboss-bar-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  z-index: 1;
}

/* Glass highlight (::before) — top 2px, inset 4px, height 40% */
.emboss-bar-fill::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 4px;
  right: 4px;
  height: 40%;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 50%, transparent 100%);
  pointer-events: none;
}

/* Shadow (::after) — bottom 0, height 35%, gradient to rgba(0,0,0,0.1) */
.emboss-bar-fill::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 35%;
  border-radius: inherit;
  background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.1) 100%);
  pointer-events: none;
}

/* Status-driven fill gradients — use background-image longhand, not background shorthand,
   because var() containing gradient values can fail shorthand parsing in some browsers */
.emboss-bar[data-status="active"] .emboss-bar-fill {
  background-image: var(--emboss-fill-active);
}
.emboss-bar[data-status="done"] .emboss-bar-fill {
  background-image: var(--emboss-fill-done);
}
.emboss-bar[data-status="upcoming"] .emboss-bar-fill {
  background-image: var(--emboss-fill-upcoming);
}

/* Opacity states — theme-responsive via CSS variables */
.emboss-bar[data-status="done"] {
  opacity: var(--emboss-opacity-done);
  transition: opacity 0.15s;
}
.emboss-bar[data-status="done"]:hover {
  opacity: 0.65;
}
.emboss-bar[data-status="upcoming"] .emboss-bar-fill {
  opacity: var(--emboss-opacity-upcoming);
}

/* Progress marker dot — z-index 2 so labels render above */
.emboss-bar-marker {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--emboss-surface);
  box-shadow: 0 0 0 2px rgba(255,255,255,0.5);
  transform: translateY(-50%);
  z-index: 2;
  cursor: ew-resize;
  transition: transform 0.15s;
}

/* Marker inner status-colored dot */
.emboss-bar-marker::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.emboss-bar[data-status="active"] .emboss-bar-marker::before {
  background: var(--emboss-ink-3);
}
.emboss-bar[data-status="done"] .emboss-bar-marker::before {
  background: var(--emboss-ink-4);
}
.emboss-bar[data-status="upcoming"] .emboss-bar-marker::before {
  background: var(--emboss-ink-4);
}

/* Marker hover scale */
.emboss-bar:hover .emboss-bar-marker {
  transform: translateY(-50%) scale(1.15);
}

/* Labels — z-index 4 above fill and marker */
.emboss-bar-label {
  position: absolute;
  top: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  z-index: 4;
}

/* Inside label — dark text in light mode (grayscale fills aren't dark enough for white) */
.emboss-bar-label-inside {
  left: 10px;
  right: 10px;
  color: var(--emboss-ink-2);
  font-weight: 500;
}

/* Dark mode: white labels (fills pop against dark bg) */
.emboss-dark .emboss-bar-label-inside {
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,.2);
}

/* Upcoming 0% in dark mode: white at 75% opacity */
.emboss-dark .emboss-bar-label-upcoming {
  opacity: 0.75;
}

/* Outside label — positioned right of bar, same vertical center */
.emboss-bar-label-outside {
  left: calc(100% + 6px);
  color: var(--emboss-ink-4);
}

/* Drag handles */
.emboss-bar-handle {
  position: absolute;
  top: 50%;
  width: 3px;
  height: 55%;
  background: rgba(255,255,255,0.4);
  border-radius: 2px;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 5;
  cursor: ew-resize;
}
.emboss-bar:hover .emboss-bar-handle {
  opacity: 0.7;
}
.emboss-bar-handle-left {
  left: 4px;
}
.emboss-bar-handle-right {
  right: 4px;
}

/* Phase bar */
.emboss-bar-phase {
  pointer-events: none;
  background: var(--emboss-ink-3);
  opacity: 0.5;
}

/* Phase label — below the thin bar, left-aligned */
.emboss-bar-label-phase {
  top: 100%;
  left: 0;
  margin-top: 2px;
  color: var(--emboss-ink-3);
  font-weight: 600;
  font-size: 10px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}
`;
