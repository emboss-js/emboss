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

const VIVID_PALETTE = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316']

function renderMilestoneBar(row: Row, scale: Scale, state: EmbossState, container?: HTMLElement): HTMLElement {
  const isDense = state.density === 'dense'
  const x = row.start * scale.dayWidth
  const centerY = Math.round(scale.rowHeight / 2)
  const size = state.density === 'presentation' ? 24 : isDense ? 14 : 20
  const half = size / 2

  // Resolve vivid color for parent phase
  const parentPhase = row.parentId ? state.rows.find(r => r.id === row.parentId && r.type === 'phase') : null
  const phaseIdx = parentPhase ? state.rows.filter(r => r.type === 'phase').indexOf(parentPhase) : 0
  const idx = phaseIdx >= 0 ? phaseIdx : 0
  const vividColor = parentPhase?.phaseColor || VIVID_PALETTE[idx % VIVID_PALETTE.length]

  const wrapper = document.createElement('div')
  wrapper.className = 'emboss-milestone'
  wrapper.dataset.id = row.id
  wrapper.dataset.status = row.status
  wrapper.style.cssText = `left:${x - half}px;top:${centerY - half}px;width:${size}px;height:${size}px;`
  // Store vivid color for CSS to use when .emboss-vivid is active
  wrapper.style.setProperty('--phase-c', vividColor)

  const diamond = document.createElement('div')
  diamond.className = 'emboss-milestone-diamond'

  // Progress fill — clips from bottom
  if (row.progress > 0) {
    const fill = document.createElement('div')
    fill.className = 'emboss-milestone-fill'
    fill.style.height = `${row.progress}%`
    diamond.appendChild(fill)
  }

  wrapper.appendChild(diamond)

  // Label — right of diamond (hidden in dense mode)
  if (isDense) {
    const hasSidebar = container?.classList.contains('emboss-has-sidebar') ?? false
    if (!hasSidebar) {
      // No sidebar: hover shows floating name tag
      wrapper.addEventListener('mouseenter', () => {
        const tag = document.createElement('div')
        tag.className = 'emboss-dense-tag'
        tag.textContent = row.name
        tag.style.left = `${x}px`
        tag.style.top = `${centerY - half - 18}px`
        ;(wrapper as any)._denseTag = tag
        wrapper.parentElement?.appendChild(tag)
      })
      wrapper.addEventListener('mouseleave', () => {
        ;(wrapper as any)._denseTag?.remove()
        ;(wrapper as any)._denseTag = null
      })
    }
    // With sidebar: label omitted entirely — sidebar row identifies it
  } else {
    const label = document.createElement('div')
    label.className = 'emboss-milestone-label'
    label.style.fontSize = `${scale.labelSize}px`
    label.textContent = row.name
    wrapper.appendChild(label)
  }

  return wrapper
}

export const milestones: EmbossExtension = {
  name: 'milestones',
  type: 'paid',
  bundle: 'organize',

  // Auto-derive milestone progress/status from dependencies
  enrichRows(rows) {
    return rows.map(r => {
      if (r.type !== 'milestone' || !r.dependencies.length) return r
      const deps = r.dependencies
        .map(id => rows.find(d => d.id === id))
        .filter(Boolean) as Row[]
      if (!deps.length) return r
      const avgProgress = Math.round(deps.reduce((sum, d) => sum + d.progress, 0) / deps.length)
      const allDone = deps.every(d => d.status === 'done')
      const anyActive = deps.some(d => d.status === 'active' || d.status === 'done')
      const status = allDone ? 'done' : anyActive ? 'active' : r.status
      return { ...r, progress: avgProgress, status }
    })
  },

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
  border: 2.5px solid var(--emboss-ink-4);
  border-radius: 3px;
  background: var(--emboss-surface);
  overflow: hidden;
  transition: transform 0.15s;
}
.emboss-vivid .emboss-milestone-diamond {
  border-color: var(--phase-c);
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
  background: var(--emboss-ink-4);
}
.emboss-vivid .emboss-milestone-fill {
  background: var(--phase-c);
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
/* Dense: smaller diamond, no glass */
.emboss-dense .emboss-milestone-diamond {
  border-width: 2px;
}
.emboss-dense .emboss-milestone-diamond::before { display: none; }
/* Presentation: larger diamond */
.emboss-presentation .emboss-milestone-diamond {
  border-width: 3px;
}
`,
}
