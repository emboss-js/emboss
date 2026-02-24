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
  if (row.type === 'phase') return renderPhaseBar(row, scale, state)
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
  const doneOpacity = row.status === 'done' ? 'opacity:var(--emboss-opacity-done,0.45);' : ''
  bar.style.cssText = `left:${left}px;width:${width}px;top:${barTop}px;height:${scale.barHeight}px;border-radius:${r}px;${doneOpacity}`

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

const VIVID_PALETTE = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316']

function renderPhaseBar(row: Row, scale: Scale, state: EmbossState): HTMLElement {
  const left = row.start * scale.dayWidth
  const width = Math.max(row.duration * scale.dayWidth, 20)
  const barTop = Math.round((scale.rowHeight - 5) / 2)
  const phaseIdx = state.rows.filter(r => r.type === 'phase').findIndex(r => r.id === row.id)
  const idx = phaseIdx >= 0 ? phaseIdx : 0
  const color = row.phaseColor || VIVID_PALETTE[idx % VIVID_PALETTE.length]

  const bar = document.createElement('div')
  bar.className = 'emboss-bar emboss-bar-phase'
  bar.dataset.id = row.id
  bar.dataset.type = 'phase'
  bar.dataset.phaseIdx = String(idx % 5)
  bar.style.cssText = `left:${left}px;width:${width}px;top:${barTop}px;height:5px;border-radius:3px;`
  bar.style.setProperty('--phase-c', color)
  if (row.phaseColor) bar.dataset.colorSet = ''

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
  outline: none;
}
.emboss-bar:focus {
  outline: none;
}

/* Track — pill-shaped container behind fill, inherits bar's border-radius */
.emboss-bar-track {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background-color: var(--emboss-track, #e8ecf1);
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

/* Status-driven fill gradients — via CSS custom properties for theme swaps */
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
  opacity: var(--emboss-opacity-done, 0.45);
  transition: opacity 0.15s;
}
.emboss-bar[data-status="done"]:hover {
  opacity: 0.65 !important;
}
.emboss-bar[data-status="upcoming"] .emboss-bar-fill {
  opacity: var(--emboss-opacity-upcoming, 0.5);
}

/* Progress marker dot — 12px outer, 6px inner, z-index 2 so labels render above */
.emboss-bar-marker {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
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

/* Inside label — white text on fill, text-shadow for contrast (§9.2) */
.emboss-bar-label-inside {
  left: 10px;
  right: 10px;
  color: #fff;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0,0,0,.2);
}

/* Dark mode: stronger text-shadow for contrast */
.emboss-dark .emboss-bar-label-inside {
  text-shadow: 0 1px 2px rgba(0,0,0,.4);
}

/* Upcoming 0% — fill covers full width, label white at 75% opacity in both themes */
.emboss-bar-label-upcoming {
  color: #fff;
  opacity: 0.75;
  text-shadow: 0 1px 2px rgba(0,0,0,.2);
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

/* Phase index → gray mapping (grayscale theme) */
[data-phase-idx] { --phase-gray: var(--emboss-ink-3); }
[data-phase-idx="0"] { --phase-gray: #4b5563; }
[data-phase-idx="1"] { --phase-gray: #6b7280; }
[data-phase-idx="2"] { --phase-gray: #9ca3af; }
[data-phase-idx="3"] { --phase-gray: #374151; }
[data-phase-idx="4"] { --phase-gray: #d1d5db; }

/* Phase bar — 5px height, no interaction */
.emboss-bar-phase {
  pointer-events: none;
  opacity: 0.4;
  background: var(--phase-gray);
}
.emboss-vivid .emboss-bar-phase {
  background: var(--phase-c);
}
/* User-picked color overrides in any theme */
.emboss-bar-phase[data-color-set] {
  background: var(--phase-c);
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
