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

import type { Row, Scale, EmbossState, EmbossExtension } from '../../../core/types'

function renderMilestoneBar(row: Row, scale: Scale, _state: EmbossState): HTMLElement {
  const x = row.start * scale.dayWidth
  const centerY = Math.round(scale.rowHeight / 2)
  const size = 20
  const half = size / 2
  const color = row.phaseColor || 'var(--emboss-ink-3)'

  const wrapper = document.createElement('div')
  wrapper.className = 'emboss-milestone'
  wrapper.dataset.id = row.id
  wrapper.dataset.status = row.status
  wrapper.style.cssText = `left:${x - half}px;top:${centerY - half}px;width:${size}px;height:${size}px;`

  const diamond = document.createElement('div')
  diamond.className = 'emboss-milestone-diamond'
  diamond.style.borderColor = color

  // Progress fill — clips from bottom
  if (row.progress > 0) {
    const fill = document.createElement('div')
    fill.className = 'emboss-milestone-fill'
    fill.style.height = `${row.progress}%`
    fill.style.background = color
    diamond.appendChild(fill)
  }

  wrapper.appendChild(diamond)

  // Label — right of diamond
  const label = document.createElement('div')
  label.className = 'emboss-milestone-label'
  label.style.fontSize = `${scale.labelSize}px`
  label.textContent = row.name
  wrapper.appendChild(label)

  return wrapper
}

export const milestones: EmbossExtension = {
  name: 'milestones',
  type: 'paid',
  bundle: 'organize',

  barRenderer: {
    milestone: renderMilestoneBar,
  },

  styles: `
.emboss-milestone {
  position: absolute;
  cursor: pointer;
  user-select: none;
  outline: none;
}
.emboss-milestone-diamond {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  transform: rotate(45deg);
  border: 2.5px solid var(--emboss-ink-3);
  border-radius: 3px;
  background: var(--emboss-surface);
  overflow: hidden;
  transition: transform 0.15s;
}
.emboss-milestone:hover .emboss-milestone-diamond {
  transform: rotate(45deg) scale(1.2);
}
/* Glass highlight */
.emboss-milestone-diamond::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%);
  pointer-events: none;
}
/* Progress fill — anchored to bottom */
.emboss-milestone-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  opacity: 0.6;
}
/* Done state */
.emboss-milestone[data-status="done"] {
  opacity: var(--emboss-opacity-done);
}
/* Label — right of diamond */
.emboss-milestone-label {
  position: absolute;
  top: 50%;
  left: calc(100% + 8px);
  transform: translateY(-50%);
  white-space: nowrap;
  color: var(--emboss-ink-2);
  font-style: italic;
  pointer-events: none;
}
`,
}
