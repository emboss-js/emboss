/**
 * @emboss/core — extensions/free/tooltips.ts
 * CONTRACT: Section 5 (extension shape), Phase 3 spec
 *
 * Dark card: var(--emboss-ink) bg, 10px radius, 10px 14px padding, 240px max-width
 * Content: task name, status dot, date range, progress
 * Position: 16px below cursor, 8px right, follows mouse, boundary detection
 * Timing: 200ms appear delay, 0.15s fade in, 80ms fade-out delay
 * z-index: 1000, pointer-events: none
 * Dark mode: inverts (light bg, dark text)
 */

import type { EmbossExtension, Row, Scale, EmbossState } from '../../core/types'
import { addDays } from '../../core/dates'

const AVATAR_PALETTE = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316']

function hashToColor(name: string): string {
  let hash = 0
  for (const char of name) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function avatarHTML(row: Row, isVivid: boolean): string {
  const bg = isVivid
    ? (row.assigneeColor || hashToColor(row.assignee!))
    : '#9ca3af'
  const initials = getInitials(row.assignee!)
  return `<div style="width:22px;height:22px;border-radius:50%;background:${bg};position:relative;flex-shrink:0;overflow:hidden"><span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#ffffff;text-shadow:0 1px 2px rgba(0,0,0,0.4),0 0 4px rgba(0,0,0,0.2);letter-spacing:0.5px">${initials}</span><span style="position:absolute;top:0;left:0;right:0;height:50%;border-radius:11px 11px 0 0;background:linear-gradient(180deg,rgba(255,255,255,0.35) 0%,transparent 100%);pointer-events:none"></span></div>`
}

function formatRange(startDate: Date, start: number, duration: number): string {
  const from = addDays(startDate, start)
  const to = addDays(startDate, start + duration - 1)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${from.toLocaleDateString('en-US', opts)} – ${to.toLocaleDateString('en-US', opts)}`
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function statusDotColor(status: string): string {
  if (status === 'active') return 'var(--emboss-ink-3)'
  if (status === 'done') return 'var(--emboss-ink-4)'
  return 'var(--emboss-ink-5)'
}

export const tooltips: EmbossExtension = {
  name: 'tooltips',
  type: 'free',

  init(emboss) {
    let tip: HTMLElement | null = null
    let showTimer: ReturnType<typeof setTimeout> | null = null
    let hideTimer: ReturnType<typeof setTimeout> | null = null
    let currentRow: Row | null = null
    let isVivid = false

    function ensureTip(): HTMLElement {
      if (!tip) {
        tip = document.createElement('div')
        tip.className = 'emboss-tip'
        document.body.appendChild(tip)
      }
      return tip
    }

    function show(row: Row, x: number, y: number) {
      const el = ensureTip()
      el.classList.toggle('emboss-tip-dark', emboss.state.theme === 'dark')
      const { scale } = emboss.state
      const range = row.duration > 0 ? formatRange(scale.startDate, row.start, row.duration) : ''
      const progressBar = row.type !== 'phase'
        ? `<div class="emboss-tip-bar"><div class="emboss-tip-fill" style="width:${row.progress}%"></div></div>`
        : ''

      el.innerHTML = `
        ${row.phaseName ? `<div class="emboss-tip-phase">${row.phaseName}</div>` : ''}
        <div class="emboss-tip-name">${row.name}</div>
        <div class="emboss-tip-row">
          <span class="emboss-tip-dot" style="background:${statusDotColor(row.status)}"></span>
          <span>${statusLabel(row.status)}</span>
          ${row.progress > 0 && row.progress < 100 ? `<span class="emboss-tip-pct">${row.progress}%</span>` : ''}
        </div>
        ${range ? `<div class="emboss-tip-range">${range}</div>` : ''}
        ${progressBar}
        ${row.assignee ? `<div class="emboss-tip-assignee">${avatarHTML(row, isVivid)}<span>${row.assignee}</span></div>` : ''}
      `

      position(el, x, y)
      el.classList.add('show')
    }

    function position(el: HTMLElement, mx: number, my: number) {
      let x = mx + 8
      let y = my + 16
      const w = 240
      const h = el.offsetHeight || 80

      // Boundary detection
      if (x + w > window.innerWidth - 8) x = mx - w - 8
      if (y + h > window.innerHeight - 8) y = my - h - 8

      el.style.left = `${x}px`
      el.style.top = `${y}px`
    }

    function hide() {
      if (tip) tip.classList.remove('show')
      currentRow = null
    }

    // Wire hover events
    emboss.on('onHover', (row: Row | null) => {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
      if (showTimer) { clearTimeout(showTimer); showTimer = null }

      if (row && row.type !== 'phase' && emboss.state.density !== 'presentation') {
        currentRow = row
        showTimer = setTimeout(() => {
          if (currentRow) show(currentRow, lastX, lastY)
        }, 200)
      } else {
        hideTimer = setTimeout(hide, 80)
      }
    })

    // Track mouse position
    let lastX = 0
    let lastY = 0

    emboss.on('afterRender', (container: HTMLElement) => {
      isVivid = container.classList.contains('emboss-vivid')
      const barsEl = container.querySelector('.emboss-bars')
      if (!barsEl || (barsEl as any).__embossTipWired) return
      ;(barsEl as any).__embossTipWired = true

      barsEl.addEventListener('mousemove', ((e: MouseEvent) => {
        lastX = e.clientX
        lastY = e.clientY
        if (tip && tip.classList.contains('show') && currentRow) {
          position(tip, lastX, lastY)
        }
      }) as EventListener)
    })
  },

  styles: `
    .emboss-tip { position: fixed; z-index: 1000; pointer-events: none; background-color: #1a1d23; color: #fff; border-radius: 10px; padding: 10px 14px; font-size: 11px; line-height: 1.5; box-shadow: 0 4px 20px rgba(0,0,0,0.15); min-width: 200px; max-width: 240px; opacity: 0; transform: translateY(4px); transition: opacity 0.15s, transform 0.15s; }
    .emboss-tip.show { opacity: 1; transform: translateY(0); }
    .emboss-tip.emboss-tip-dark { background-color: #e5e7eb; color: #1a1d23; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
    .emboss-tip-phase { font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; color: rgba(255,255,255,0.6); margin-bottom: 2px; }
    .emboss-tip-name { font-weight: 600; font-size: 12px; margin-bottom: 4px; }
    .emboss-tip-row { display: flex; align-items: center; gap: 5px; margin-bottom: 3px; }
    .emboss-tip-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .emboss-tip-pct { color: rgba(255,255,255,0.6); margin-left: auto; }
    .emboss-tip-range { color: rgba(255,255,255,0.6); font-size: 10px; margin-bottom: 4px; }
    .emboss-tip-bar { height: 3px; background: rgba(255,255,255,0.15); border-radius: 2px; margin-top: 4px; overflow: hidden; }
    .emboss-tip-fill { height: 100%; background: rgba(255,255,255,0.5); border-radius: 2px; }
    .emboss-tip-dark .emboss-tip-phase,
    .emboss-tip-dark .emboss-tip-pct,
    .emboss-tip-dark .emboss-tip-range,
    .emboss-tip-dark .emboss-tip-assignee { color: #4b5563; }
    .emboss-tip-dark .emboss-tip-bar { background: rgba(0,0,0,0.08); }
    .emboss-tip-dark .emboss-tip-fill { background: rgba(0,0,0,0.2); }
    .emboss-tip-assignee { margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: rgba(255,255,255,0.6); display: flex; align-items: center; gap: 10px; }
    .emboss-tip-dark .emboss-tip-assignee { border-top-color: rgba(0,0,0,0.08); }
  `,
}
