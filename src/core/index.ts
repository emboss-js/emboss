/**
 * @emboss/core — index.ts (core)
 * CONTRACT: Section 2 (state mutations), Section 5 (extension registration), Section 10 Phase 2
 *
 * The Emboss class. Creates state, registers extensions, runs render cycle.
 * Phase 2: container DOM, renderers, drag + hover wiring.
 */

import type {
  Row, EmbossState, EmbossExtension, EmbossInstance,
  SidebarRenderer, BarRenderer, HeaderRenderer,
} from './types'
import { createState, calcScale, recalcHidden } from './state'
import { renderBar, BAR_STYLES } from './renderers/bar'
import { renderHeader, HEADER_STYLES } from './renderers/header'
import { renderGrid, GRID_STYLES } from './renderers/grid'
import { initDrag, DRAG_STYLES } from './drag'
import { setLicense, checkLicense } from '../license'

export interface EmbossConfig {
  extensions?: EmbossExtension[]
  theme?: string
  density?: EmbossState['density']
  view?: EmbossState['view']
  startDate?: Date
  licenseKey?: string
  sidebar?: { columns?: string[] }
}

const CORE_STYLES = `
.emboss {
  position: relative;
  overflow: hidden;
  height: 100%;
  background: var(--emboss-bg);
  color: var(--emboss-ink);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: var(--emboss-label-size);
  line-height: 1.4;
  -webkit-font-smoothing: antialiased;
}
.emboss-body {
  position: relative;
  overflow: auto;
}
.emboss-spacer {
  pointer-events: none;
}
.emboss-bars {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}
`

export class Emboss implements EmbossInstance {
  state: EmbossState
  readonly options: EmbossConfig
  get rows(): Row[] { return this.state.rows }
  private container: HTMLElement
  private extensions: EmbossExtension[] = []
  private listeners: Record<string, ((...args: any[]) => any)[]> = {}

  // Merged renderer maps — built from extensions in registration order
  private sidebarRenderers: Record<string, SidebarRenderer> = {}
  private barRenderers: Record<string, BarRenderer> = {}
  private headerRenderer: HeaderRenderer | null = null

  // DOM skeleton — created once, re-used on subsequent renders
  private headerEl: HTMLElement | null = null
  private bodyEl: HTMLElement | null = null
  private gridEl: HTMLElement | null = null
  private barsEl: HTMLElement | null = null
  private spacerEl: HTMLElement | null = null
  private dragCleanup: (() => void) | null = null

  constructor(selector: string, rows: Row[], config: EmbossConfig = {}) {
    const el = document.querySelector(selector)
    if (!el) throw new Error(`Emboss: no element found for "${selector}"`)
    this.container = el as HTMLElement
    this.options = config

    // Project start: config.startDate or today
    const startDate = config.startDate ? new Date(config.startDate) : new Date()
    startDate.setHours(0, 0, 0, 0)
    this.state = createState(rows, startDate)

    if (config.view) this.state.view = config.view
    if (config.density) this.state.density = config.density
    if (config.theme) this.state.theme = config.theme

    // Recalculate scale with final view/density
    this.state.scale = calcScale(this.state.view, this.state.density, rows, startDate)

    // License key — soft enforcement
    if (config.licenseKey) setLicense(config.licenseKey)

    // Inject core styles
    this.injectStyles('core', CORE_STYLES + BAR_STYLES + HEADER_STYLES + GRID_STYLES + DRAG_STYLES)

    // Register extensions in order — later overrides earlier
    if (config.extensions) {
      for (const ext of config.extensions) this.use(ext)
    }

    this.render()
  }

  private injectStyles(name: string, css: string): void {
    const style = document.createElement('style')
    style.textContent = css
    style.dataset.emboss = name
    document.head.appendChild(style)
  }

  use(ext: EmbossExtension): void {
    // Gate paid extensions — skip entirely if license check fails
    if (ext.type === 'paid' && ext.bundle && !checkLicense(ext.bundle)) {
      return
    }

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

  remove(name: string): void {
    const idx = this.extensions.findIndex(e => e.name === name)
    if (idx === -1) return

    this.extensions.splice(idx, 1)

    // Remove injected styles
    const styleEl = document.head.querySelector(`[data-emboss-ext="${name}"]`)
    if (styleEl) styleEl.remove()

    // Rebuild renderer maps from remaining extensions
    this.sidebarRenderers = {}
    this.barRenderers = {}
    this.headerRenderer = null
    for (const ext of this.extensions) {
      if (ext.sidebarRenderer) Object.assign(this.sidebarRenderers, ext.sidebarRenderer)
      if (ext.barRenderer) Object.assign(this.barRenderers, ext.barRenderer)
      if (ext.headerRenderer) this.headerRenderer = ext.headerRenderer
    }

    this.render()
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
    // Remove base theme classes but preserve vivid overlay
    this.container.classList.remove('emboss-grayscale', 'emboss-dark')
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
    this.state.scale = calcScale(this.state.view, this.state.density, this.state.rows, this.state.scale.startDate)
    this.render()
  }

  addRow(row: Row, afterId?: string): void {
    if (afterId) {
      const idx = this.state.rows.findIndex(r => r.id === afterId)
      if (idx >= 0) this.state.rows.splice(idx + 1, 0, row)
      else this.state.rows.push(row)
    } else {
      this.state.rows.push(row)
    }
    recalcHidden(this.state)
    this.state.scale = calcScale(this.state.view, this.state.density, this.state.rows, this.state.scale.startDate)
    this.render()
  }

  removeRow(rowId: string): void {
    this.state.rows = this.state.rows.filter(r => r.id !== rowId)
    for (const row of this.state.rows) {
      if (row.children) row.children = row.children.filter(id => id !== rowId)
    }
    recalcHidden(this.state)
    this.state.scale = calcScale(this.state.view, this.state.density, this.state.rows, this.state.scale.startDate)
    this.render()
  }

  // ─── Event system ──────────────────────────────────────────────────────────

  on(event: string, handler: (...args: any[]) => void): void {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(handler)
  }

  emit(event: string, ...args: any[]): void | false {
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

    // 3. Ensure DOM skeleton exists
    if (!this.headerEl) this.createSkeleton()

    // 4. Filter visible rows
    const visibleRows = rows.filter(r => !r.hidden)
    const { scale } = this.state
    const totalWidth = scale.totalDays * scale.dayWidth
    const totalHeight = visibleRows.length * scale.rowHeight

    // 5. Update container attributes
    this.container.dataset.density = this.state.density
    this.container.classList.toggle('emboss-dense', this.state.density === 'dense')
    this.container.classList.toggle('emboss-presentation', this.state.density === 'presentation')
    if (!this.container.classList.contains(`emboss-${this.state.theme}`)) {
      this.container.classList.remove('emboss-grayscale', 'emboss-dark')
      this.container.classList.add(`emboss-${this.state.theme}`)
    }

    // 6. Render header
    const headerContent = this.headerRenderer
      ? this.headerRenderer(scale, this.state)
      : renderHeader(scale, this.state)
    this.headerEl!.innerHTML = ''
    this.headerEl!.appendChild(headerContent)
    // Set header scroll content width so it can sync with body
    headerContent.style.minWidth = `${totalWidth}px`

    // 7. Render grid
    const gridContent = renderGrid(scale, this.state, visibleRows.length)
    this.gridEl!.innerHTML = ''
    this.gridEl!.appendChild(gridContent)

    // 8. Render bars using DocumentFragment for batched DOM writes
    const fragment = document.createDocumentFragment()
    visibleRows.forEach((row, index) => {
      // Check for extension bar renderer override
      const extRenderer = this.barRenderers[row.type]
      const barEl = extRenderer
        ? extRenderer(row, scale, this.state, this.container)
        : renderBar(row, scale, this.state, this.container)

      // Position vertically by row index
      const innerTop = Math.round((scale.rowHeight - scale.barHeight) / 2)
      if (row.type === 'phase') {
        const phaseH = this.state.density === 'presentation' ? 7 : 5
        ;(barEl as HTMLElement).style.top = `${index * scale.rowHeight + Math.round((scale.rowHeight - phaseH) / 2)}px`
      } else {
        ;(barEl as HTMLElement).style.top = `${index * scale.rowHeight + innerTop}px`
      }

      fragment.appendChild(barEl)
    })
    this.barsEl!.innerHTML = ''
    this.barsEl!.appendChild(fragment)

    // 9. Set content dimensions via spacer (in-flow element for scroll sizing)
    // Grid and bars are position:absolute — they don't contribute to scroll dimensions.
    // The spacer is in normal flow and defines the scrollable area.
    this.spacerEl!.style.width = `${totalWidth}px`
    this.spacerEl!.style.height = `${totalHeight}px`
    this.barsEl!.style.width = `${totalWidth}px`
    this.barsEl!.style.height = `${totalHeight}px`
    this.gridEl!.style.width = `${totalWidth}px`
    this.gridEl!.style.height = `${totalHeight}px`

    // 10. Emit afterRender for extensions
    this.emit('afterRender', this.container, scale, this.state)
  }

  private createSkeleton(): void {
    this.container.classList.add('emboss')

    this.headerEl = document.createElement('div')
    this.headerEl.className = 'emboss-header'

    this.bodyEl = document.createElement('div')
    this.bodyEl.className = 'emboss-body'

    this.gridEl = document.createElement('div')
    this.gridEl.className = 'emboss-grid'

    this.barsEl = document.createElement('div')
    this.barsEl.className = 'emboss-bars'

    // Spacer: in-flow element that defines scrollable area.
    // Grid and bars are absolute-positioned and don't contribute to scroll dimensions.
    this.spacerEl = document.createElement('div')
    this.spacerEl.className = 'emboss-spacer'

    this.bodyEl.appendChild(this.spacerEl)
    this.bodyEl.appendChild(this.gridEl)
    this.bodyEl.appendChild(this.barsEl)

    this.container.innerHTML = ''
    this.container.appendChild(this.headerEl)
    this.container.appendChild(this.bodyEl)

    // Scroll sync: header follows body horizontal scroll
    this.bodyEl.addEventListener('scroll', () => {
      this.headerEl!.scrollLeft = this.bodyEl!.scrollLeft
    })

    // Init drag handling
    this.dragCleanup = initDrag(this.barsEl, {
      emit: (event: string, ...args: any[]) => this.emit(event, ...args),
      updateRow: (id: string, changes: Partial<Row>) => this.updateRow(id, changes),
      getState: () => this.state,
    })

    // Hover delegation
    this.barsEl.addEventListener('mouseover', (e: MouseEvent) => {
      const barEl = (e.target as HTMLElement).closest('.emboss-bar[data-id]') as HTMLElement | null
      if (barEl) {
        const rowId = barEl.dataset.id!
        const row = this.state.rows.find(r => r.id === rowId) ?? null
        if (row && this.state.hoveredRow !== row.id) {
          this.state.hoveredRow = row.id
          this.emit('onHover', row)
        }
      }
    })
    this.barsEl.addEventListener('mouseout', (e: MouseEvent) => {
      const barEl = (e.target as HTMLElement).closest('.emboss-bar[data-id]') as HTMLElement | null
      const related = (e as MouseEvent).relatedTarget as HTMLElement | null
      const stillInBar = related?.closest('.emboss-bar[data-id]')
      if (barEl && !stillInBar) {
        this.state.hoveredRow = null
        this.emit('onHover', null)
      }
    })

    // Click delegation
    this.barsEl.addEventListener('click', (e: MouseEvent) => {
      const barEl = (e.target as HTMLElement).closest('.emboss-bar[data-id]') as HTMLElement | null
      if (barEl) {
        const rowId = barEl.dataset.id!
        const row = this.state.rows.find(r => r.id === rowId)
        if (row) {
          this.state.selected = row.id
          this.emit('onClick', row, e)
        }
      }
    })
  }

  destroy(): void {
    // Clean up drag
    if (this.dragCleanup) this.dragCleanup()
    // Remove injected styles
    document.querySelectorAll('[data-emboss],[data-emboss-ext]').forEach(el => el.remove())
    this.container.innerHTML = ''
    this.container.classList.remove('emboss')
    this.headerEl = null
    this.bodyEl = null
    this.gridEl = null
    this.barsEl = null
    this.spacerEl = null
    this.listeners = {}
  }
}
