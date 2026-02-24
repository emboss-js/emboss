/**
 * @emboss/core — types.ts
 * CONTRACT: Sections 1 (Row), 2 (State/Scale), 3 (Renderers), 4 (Events), 5 (Extensions)
 *
 * This is THE source of truth for all types. Every other file imports from here.
 * If you're tempted to define a type elsewhere, don't — put it here.
 */

// ─── THE ONE RULE: Everything Is a Row ───────────────────────────────────────
// Spec Section 1. A phase is a row. A task is a row. A milestone is a row.
// The renderer receives an ordered array of these and produces pixels.

export interface Row {
  id: string
  type: 'task' | 'phase' | 'milestone' | 'subtask'
  name: string
  depth: number           // 0 = top-level, 1 = nested under phase, 2 = subtask
  parentId: string | null // phase ID for tasks, task ID for subtasks
  collapsed: boolean      // only meaningful for rows with children
  hidden: boolean         // true when parent is collapsed — renderer skips

  // Timeline positioning
  start: number           // day offset from project start (0-indexed)
  duration: number        // in days (0 for milestones)
  progress: number        // 0–100
  status: 'done' | 'active' | 'upcoming'
  dependencies: string[]  // IDs of rows this depends on

  // Extension data — added by extensions, consumed by renderers
  assignee?: string
  assigneeColor?: string
  phaseColor?: string
  phaseName?: string
  isCritical?: boolean
  children?: string[]     // IDs of child rows (for collapse logic)
}

// ─── STATE ───────────────────────────────────────────────────────────────────
// Spec Section 2. One object. One source of truth.

export interface EmbossState {
  rows: Row[]
  view: 'day' | 'week' | 'month' | 'quarter'
  density: 'working' | 'presentation' | 'dense'
  theme: 'grayscale' | 'dark' | string
  collapsed: Record<string, boolean>
  selected: string | null
  hoveredRow: string | null
  settings: {
    markWeekends: boolean
    excludeWeekends: boolean
    holidays: string[]     // ISO date strings
    ignoredDays: string[]  // ISO date strings
  }
  scale: Scale
}

export interface Scale {
  dayWidth: number
  rowHeight: number
  barHeight: number
  barRadius: number
  totalDays: number
  startDate: Date
  labelSize: number
}

// ─── RENDERERS ───────────────────────────────────────────────────────────────
// Spec Section 3. Three slots per row. Core provides defaults.

export type SidebarRenderer = (row: Row, state: EmbossState) => HTMLElement | null
export type BarRenderer = (row: Row, scale: Scale, state: EmbossState, container?: HTMLElement) => SVGElement | HTMLElement
export type HeaderRenderer = (scale: Scale, state: EmbossState) => HTMLElement

// ─── EVENTS ──────────────────────────────────────────────────────────────────
// Spec Section 4. The ONLY way user actions affect state.

export interface RowUpdate {
  start?: number
  duration?: number
  progress?: number
}

export interface EmbossEvents {
  onDragStart(row: Row, type: 'move' | 'resize-left' | 'resize-right' | 'progress'): void | false
  onDragMove(row: Row, delta: { days: number; progress?: number }): void
  onDragEnd(row: Row, update: RowUpdate): void | false

  onClick(row: Row, event: MouseEvent): void
  onHover(row: Row | null): void
  onCollapse(row: Row, collapsed: boolean): void
  onViewChange(view: string): void
  onDensityChange(density: string): void
  onThemeChange(theme: string): void

  onRowUpdate(row: Row, changes: Partial<Row>): void | false
  onRowReorder(rowId: string, newIndex: number): void
  onRowReparent(row: Row, oldParent: Row | null, newParent: Row | null, newType: string): void | false

  onBeforeRender(rows: Row[], state: EmbossState): Row[]
}

// ─── EXTENSIONS ──────────────────────────────────────────────────────────────
// Spec Section 5. Plain objects. No plugin framework.

export interface EmbossExtension {
  name: string
  type: 'free' | 'paid'
  bundle?: string

  sidebarRenderer?: Record<string, SidebarRenderer>
  barRenderer?: Record<string, BarRenderer>
  headerRenderer?: HeaderRenderer

  handlers?: Partial<EmbossEvents>
  enrichRows?: (rows: Row[], state: EmbossState) => Row[]
  styles?: string
  init?: (emboss: EmbossInstance) => void
}

// ─── INSTANCE ────────────────────────────────────────────────────────────────
// The public API surface of an Emboss chart.

export interface EmbossInstance {
  state: EmbossState
  readonly rows: Row[]
  setView(view: EmbossState['view']): void
  setDensity(density: EmbossState['density']): void
  setTheme(theme: string): void
  toggleCollapse(rowId: string): void
  updateRow(rowId: string, changes: Partial<Row>): void
  addRow(row: Row, afterId?: string): void
  removeRow(rowId: string): void
  use(extension: EmbossExtension): void
  remove(name: string): void
  on(event: string, handler: (...args: any[]) => void): void
  emit(event: string, ...args: any[]): void | false
  render(): void
  destroy(): void
}
