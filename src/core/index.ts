/**
 * @emboss/core — index.ts (core)
 * CONTRACT: Section 2 (state mutations), Section 5 (extension registration), Section 10 Phase 1
 *
 * The Emboss class. Creates state, registers extensions, runs render cycle.
 * This is the engine — it coordinates, it doesn't render.
 */

import type {
  Row, EmbossState, EmbossExtension, EmbossInstance,
  SidebarRenderer, BarRenderer, HeaderRenderer,
} from './types'
import { createState, calcScale, recalcHidden } from './state'

export interface EmbossConfig {
  extensions?: EmbossExtension[]
  theme?: string
  density?: EmbossState['density']
  view?: EmbossState['view']
  licenseKey?: string
}

export class Emboss implements EmbossInstance {
  state: EmbossState
  private container: HTMLElement
  private extensions: EmbossExtension[] = []
  private listeners: Record<string, ((...args: any[]) => void)[]> = {}

  // Merged renderer maps — built from extensions in registration order
  private sidebarRenderers: Record<string, SidebarRenderer> = {}
  private barRenderers: Record<string, BarRenderer> = {}
  private headerRenderer: HeaderRenderer | null = null

  constructor(selector: string, rows: Row[], config: EmbossConfig = {}) {
    const el = document.querySelector(selector)
    if (!el) throw new Error(`Emboss: no element found for "${selector}"`)
    this.container = el as HTMLElement

    // Derive project start from earliest row
    const minStart = rows.reduce((m, r) => Math.min(m, r.start), Infinity)
    const startDate = new Date() // TODO: derive from actual dates via dates.ts
    this.state = createState(rows, startDate)

    if (config.view) this.state.view = config.view
    if (config.density) this.state.density = config.density
    if (config.theme) this.state.theme = config.theme

    // Recalculate scale with final view/density
    this.state.scale = calcScale(this.state.view, this.state.density, rows, startDate)

    // Register extensions in order — later overrides earlier
    if (config.extensions) {
      for (const ext of config.extensions) this.use(ext)
    }

    this.render()
  }

  use(ext: EmbossExtension): void {
    this.extensions.push(ext)

    // Merge renderers
    if (ext.sidebarRenderer) Object.assign(this.sidebarRenderers, ext.sidebarRenderer)
    if (ext.barRenderer) Object.assign(this.barRenderers, ext.barRenderer)
    if (ext.headerRenderer) this.headerRenderer = ext.headerRenderer

    // Inject styles
    if (ext.styles) {
      const style = document.createElement('style')
      style.textContent = ext.styles
      style.dataset.embossExt = ext.name
      document.head.appendChild(style)
    }

    // Init
    if (ext.init) ext.init(this)
  }

  // ─── State mutations (Section 2) ───────────────────────────────────────────

  setView(view: EmbossState['view']): void {
    this.state.view = view
    this.state.scale = calcScale(view, this.state.density, this.state.rows, this.state.scale.startDate)
    this.emit('onViewChange', view)
    this.render()
  }

  setDensity(density: EmbossState['density']): void {
    this.state.density = density
    this.state.scale = calcScale(this.state.view, density, this.state.rows, this.state.scale.startDate)
    this.emit('onDensityChange', density)
    this.render()
  }

  setTheme(theme: string): void {
    this.state.theme = theme
    this.container.classList.remove('emboss-grayscale', 'emboss-dark', 'emboss-vivid')
    this.container.classList.add(`emboss-${theme}`)
    this.emit('onThemeChange', theme)
    this.render()
  }

  toggleCollapse(rowId: string): void {
    this.state.collapsed[rowId] = !this.state.collapsed[rowId]
    recalcHidden(this.state)
    const row = this.state.rows.find(r => r.id === rowId)
    if (row) this.emit('onCollapse', row, this.state.collapsed[rowId])
    this.render()
  }

  updateRow(rowId: string, changes: Partial<Row>): void {
    const row = this.state.rows.find(r => r.id === rowId)
    if (!row) return
    // Let extensions reject the update
    const rejected = this.emit('onRowUpdate', row, changes)
    if (rejected === false) return
    Object.assign(row, changes)
    this.render()
  }

  // ─── Event system ──────────────────────────────────────────────────────────

  on(event: string, handler: (...args: any[]) => void): void {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(handler)
  }

  private emit(event: string, ...args: any[]): void | false {
    // Fire extension handlers first
    for (const ext of this.extensions) {
      const h = ext.handlers?.[event as keyof typeof ext.handlers] as any
      if (h && h(...args) === false) return false
    }
    // Fire registered listeners
    for (const fn of this.listeners[event] ?? []) {
      if (fn(...args) === false) return false
    }
  }

  // ─── Render cycle ──────────────────────────────────────────────────────────

  render(): void {
    // 1. Let extensions enrich rows
    let rows = this.state.rows
    for (const ext of this.extensions) {
      if (ext.enrichRows) rows = ext.enrichRows(rows, this.state)
    }

    // 2. Let extensions transform before render
    this.emit('onBeforeRender', rows, this.state)

    // 3. Render — TODO: Phase 2 implements actual DOM output
    // For now, emit afterRender so extensions like todayMarker can hook in
    this.emit('afterRender', this.container, this.state.scale, this.state)
  }

  destroy(): void {
    // Remove injected styles
    document.querySelectorAll('[data-emboss-ext]').forEach(el => el.remove())
    this.container.innerHTML = ''
    this.listeners = {}
  }
}
