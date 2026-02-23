# Emboss — Build Specification for Claude Code

**What this is:** The architecture contract for building Emboss, a Gantt chart library forked from Frappe Gantt. Every section is a binding decision. There are no open questions — if something isn't specified, use your best judgment and document the choice.

**What Emboss is:** The Tiptap of Gantt charts. Frappe Gantt is ProseMirror — the engine. Emboss wraps it in a design system, extension architecture, and business model. Single npm package: `@emboss/core`.

**Rule for every file you write:** Before creating any module, identify which contract it fulfills from this document. If it doesn't map to a contract, it probably shouldn't exist.

**Size constraint:** Emboss core + free extensions should be under 3,000 lines of TypeScript. The Organize bundle should add under 1,500. If you're exceeding these numbers, you're over-engineering. Frappe Gantt does everything in 1,500 lines — Emboss does more, but not 10× more. No abstraction layers that don't directly produce pixels or handle user input. No utility classes. No base classes. No factories. Plain functions, plain objects, one render cycle.

---

## 1. THE ONE RULE: Everything Is a Row

This is the architectural foundation. Internalize it before writing any code.

A phase is a row. A task is a row. A milestone is a row. A subtask is a row. The renderer doesn't care — it receives an ordered array of Row objects and produces two synchronized outputs: a sidebar cell and a timeline cell for each row.

This means:
- The sidebar and chart share ONE row index. Row 5 in the sidebar is row 5 on the timeline. Always.
- Scroll position is synchronized by row index, not by separate scroll listeners trying to stay in sync.
- Hover state, selection state, and collapse state are properties of the row, not properties of the sidebar or chart independently.
- Extensions don't "add a sidebar" or "add milestones." They register renderers that handle specific row types.

```typescript
interface Row {
  id: string
  type: 'task' | 'phase' | 'milestone' | 'subtask'
  name: string
  depth: number           // 0 = top-level, 1 = nested under phase, 2 = subtask
  parentId: string | null // phase ID for tasks, task ID for subtasks
  collapsed: boolean      // only meaningful for rows with children
  hidden: boolean         // true when parent is collapsed — renderer skips this row

  // Timeline positioning (only for types that render bars/diamonds)
  start: number           // day offset from project start (0-indexed)
  duration: number        // in days (0 for milestones)
  progress: number        // 0–100
  status: 'done' | 'active' | 'upcoming'
  dependencies: string[]  // IDs of rows this depends on

  // Extension data (optional, added by extensions)
  assignee?: string
  assigneeColor?: string
  phaseColor?: string
  phaseName?: string
  isCritical?: boolean
  children?: string[]     // IDs of child rows (for collapse logic)
}
```

**Critical:** the `Row` type is the ONLY data structure that flows through the system. Extensions enrich rows (add fields) and renderers consume rows (read fields). Nobody creates parallel data structures.

---

## 2. STATE

One state object. One source of truth. Extensions read from it, write to it through methods, never directly.

```typescript
interface EmbossState {
  rows: Row[]                    // the flat, ordered array — THE source of truth
  view: 'day' | 'week' | 'month' | 'quarter'
  density: 'working' | 'presentation' | 'dense'
  theme: 'grayscale' | 'dark' | string  // string for custom/paid themes
  collapsed: Record<string, boolean>     // row ID → collapsed state
  selected: string | null                // row ID of selected row
  hoveredRow: string | null              // row ID being hovered
  settings: {
    markWeekends: boolean
    excludeWeekends: boolean
    holidays: string[]           // ISO date strings
    ignoredDays: string[]        // ISO date strings
  }
  scale: Scale                   // derived, recalculated on view/density change
}

interface Scale {
  dayWidth: number       // pixels per day
  rowHeight: number      // pixels per row
  barHeight: number      // pixels for bar element
  barRadius: number      // border-radius
  totalDays: number      // project span
  startDate: Date        // first day
  labelSize: number      // font size for bar labels
}
```

**Scale values by view × density:**

| | Day | Week | Month | Quarter |
|---|---|---|---|---|
| **Working** | dw:44 rh:44 bh:26 lbl:11.5 | dw:32 rh:44 bh:26 lbl:11.5 | dw:12 rh:40 bh:22 lbl:11.5 | dw:7 rh:40 bh:22 lbl:11.5 |
| **Presentation** | dw:44 rh:56 bh:32 lbl:12.5 | dw:32 rh:56 bh:32 lbl:12.5 | dw:12 rh:52 bh:28 lbl:12.5 | dw:7 rh:52 bh:28 lbl:12.5 |
| **Dense** | dw:44 rh:34 bh:20 lbl:10 | dw:32 rh:34 bh:20 lbl:10 | dw:12 rh:32 bh:18 lbl:10 | dw:7 rh:32 bh:18 lbl:10 |

**State mutation:** All state changes go through methods on the Emboss instance:
- `emboss.setView('month')` — recalculates scale, re-renders
- `emboss.toggleCollapse(rowId)` — updates collapsed map, recalculates hidden flags, re-renders
- `emboss.updateRow(rowId, changes)` — merges changes into row, re-renders
- `emboss.setTheme('dark')` — swaps CSS class on root, re-renders
- `emboss.setDensity('presentation')` — recalculates scale, re-renders

Extensions hook into state changes via the event system (Section 4).

---

## 3. RENDERERS — How Rows Become Pixels

Three renderer slots per row. Core provides defaults. Extensions replace or wrap them.

### 3.1 SidebarRenderer

```typescript
type SidebarRenderer = (row: Row, state: EmbossState) => HTMLElement | null
```

- Receives a Row and the current state.
- Returns a DOM element that will be placed in the sidebar at this row's vertical position.
- Return `null` to use no sidebar cell for this row (core behavior when sidebar is off).
- The element's height MUST equal `state.scale.rowHeight`. The renderer does not control positioning — the layout engine handles that.

**Core default (no sidebar extension):** returns `null`. No sidebar.

**Organize extension provides:**
- `type === 'phase'` → colored pill + name + chevron + task count badge
- `type === 'task'` → status dot + name + assignee avatar (if Team extension active)
- `type === 'milestone'` → diamond icon + italic name
- `type === 'subtask'` → indented (depth × 16px extra padding) + dot + name

### 3.2 BarRenderer

```typescript
type BarRenderer = (row: Row, scale: Scale, state: EmbossState) => SVGElement | HTMLElement
```

- Returns the visual element placed on the timeline at this row's position.
- The renderer receives scale to calculate pixel positions: `left = row.start * scale.dayWidth`, `width = row.duration * scale.dayWidth`.
- The layout engine sets vertical position based on row index × rowHeight. The renderer controls the element's internal layout only.

**Core provides these bar renderers:**

For `type === 'task'` or `type === 'subtask'`:
- Glass bar: track (full width, rounded) + fill (progress width, left-rounded) + glass highlight + shadow
- Progress marker dot at fill edge (hidden at 0% and 100%)
- Label: inside bar if bar > 70px wide, outside right otherwise
- Drag handles: inset 4px from edges, visible on hover, hidden in presentation density

For `type === 'milestone'`:
- 20×20px diamond (rotated square), phase-colored border, glass highlight
- Progress fill bottom-to-top inside diamond
- Done state: 45% opacity

For `type === 'phase'`:
- Thin bar (5px height) spanning from earliest child start to latest child end
- Phase color at 25% opacity
- No interaction (pointer-events: none)

### 3.3 HeaderRenderer

```typescript
type HeaderRenderer = (scale: Scale, state: EmbossState) => HTMLElement
```

- Returns the timeline header showing time divisions.
- View mode determines granularity:
  - **Day:** Month labels top, individual date numbers below, weekend dates dimmed
  - **Week:** Month labels with year
  - **Month:** Abbreviated month labels (Feb, Mar, Apr)
  - **Quarter:** Q1 2026, Q2 2026 labels with month sub-labels

---

## 4. EVENTS — How Interactions Become State Changes

Events are the ONLY way user actions affect state. The renderer emits events, the core engine processes them, extensions can intercept them.

```typescript
interface EmbossEvents {
  // Drag events
  onDragStart(row: Row, type: 'move' | 'resize-left' | 'resize-right' | 'progress'): void | false
  onDragMove(row: Row, delta: { days: number, progress?: number }): void
  onDragEnd(row: Row, update: RowUpdate): void | false  // return false to cancel

  // Interaction events
  onClick(row: Row, event: MouseEvent): void
  onHover(row: Row | null): void          // null = hover ended
  onCollapse(row: Row, collapsed: boolean): void
  onViewChange(view: string): void
  onDensityChange(density: string): void
  onThemeChange(theme: string): void

  // Data events
  onRowUpdate(row: Row, changes: Partial<Row>): void | false  // return false to reject
  onRowReorder(rowId: string, newIndex: number): void

  // Extension hook
  onBeforeRender(rows: Row[], state: EmbossState): Row[]  // extensions can transform rows before render
}

interface RowUpdate {
  start?: number
  duration?: number
  progress?: number
}
```

**Event flow for drag-to-reschedule:**
1. User mousedown on bar → core emits `onDragStart(row, 'move')`
2. Extensions can return `false` to prevent drag (e.g., locked row)
3. User mousemove → core calculates day delta → emits `onDragMove(row, {days: 2})`
4. Core renders ghost bar at new position during drag
5. User mouseup → core emits `onDragEnd(row, {start: row.start + 2})`
6. If no handler returns false → core calls `emboss.updateRow(row.id, {start: row.start + 2})`
7. State updates → re-render

**Event flow for hover → dependency arrows:**
1. User hovers bar → core emits `onHover(row)`
2. Core sets `state.hoveredRow = row.id`
3. Re-render: dependency arrow renderer checks `state.hoveredRow` and shows arrows connected to that row
4. User moves away → `onHover(null)` → arrows fade out

---

## 5. EXTENSION REGISTRATION

Extensions are objects with a standard shape. They declare what they provide and the core merges them.

```typescript
interface EmbossExtension {
  name: string
  type: 'free' | 'paid'
  bundle?: string                                    // 'organize' | 'team' | 'analyze' | 'subtasks'

  // Renderers (optional — only provide what you're adding)
  sidebarRenderer?: Record<string, SidebarRenderer>  // keyed by row type
  barRenderer?: Record<string, BarRenderer>           // keyed by row type
  headerRenderer?: HeaderRenderer

  // Event handlers (optional)
  handlers?: Partial<EmbossEvents>

  // Row enrichment — runs before render, adds data to rows
  enrichRows?: (rows: Row[], state: EmbossState) => Row[]

  // CSS — injected into document
  styles?: string

  // Init — runs once when extension is registered
  init?: (emboss: EmbossInstance) => void
}
```

**Registration order matters.** Later extensions override earlier ones for the same renderer key. Core registers first, then free extensions, then paid extensions, then templates.

```typescript
const chart = new Emboss('#gantt', tasks, {
  extensions: [todayMarker, tooltips, sidebar, phases, milestones],
  theme: 'dark'
})
// Registration order: core defaults → todayMarker → tooltips → sidebar → phases → milestones
// If sidebar provides a sidebarRenderer for 'task', it replaces core's null renderer
// If phases provides a sidebarRenderer for 'phase', it adds a new row type renderer
```

**Example — Today Marker extension:**

```typescript
const todayMarker: EmbossExtension = {
  name: 'today-marker',
  type: 'free',

  // No renderers — it adds an overlay element to the chart, not per-row
  init(emboss) {
    // After each render, position the today line
    emboss.on('afterRender', (container, scale, state) => {
      const todayOffset = daysBetween(state.scale.startDate, new Date())
      const x = todayOffset * scale.dayWidth
      // Render: line + dot + pulsing ring + column glow + "Today" label
      // Position at x, full height of chart
      // z-index: line 20, dot 25, glow 1
    })
  },

  styles: `
    .emboss-today-line { ... }
    .emboss-today-dot { ... }
    .emboss-today-ring { animation: emboss-pulse 2s ease-in-out infinite; }
  `
}
```

**Example — Organize sidebar extension:**

```typescript
const sidebar: EmbossExtension = {
  name: 'sidebar',
  type: 'paid',
  bundle: 'organize',

  sidebarRenderer: {
    task: (row, state) => {
      const el = document.createElement('div')
      el.className = 'emboss-sidebar-task'
      el.style.height = state.scale.rowHeight + 'px'
      el.style.paddingLeft = (16 + row.depth * 16) + 'px'
      el.innerHTML = `
        <span class="emboss-dot" style="background:${statusColor(row.status)}"></span>
        <span class="emboss-task-name">${row.name}</span>
      `
      return el
    },
    phase: (row, state) => { /* colored pill + chevron + count */ },
    milestone: (row, state) => { /* diamond icon + italic name */ },
    subtask: (row, state) => { /* indented, smaller dot */ }
  },

  init(emboss) {
    // Create sidebar container, sync scroll with chart
    // Handle collapse clicks
    // Handle rail mode toggle
  },

  styles: `
    .emboss-sidebar { width: var(--emboss-sidebar-w, 280px); ... }
    .emboss-sidebar.rail { width: 48px; ... }
  `
}
```

---

## 6. CSS CUSTOM PROPERTIES

All visual values go through `--emboss-` prefixed custom properties. This is how themes work — they override these properties.

```css
/* Core defaults (grayscale light) */
:root {
  /* Surface */
  --emboss-bg: #f5f6f8;
  --emboss-surface: #fff;
  --emboss-surface-2: #fafbfc;
  --emboss-border: #f0f1f4;

  /* Ink */
  --emboss-ink: #1a1d23;
  --emboss-ink-2: #374151;
  --emboss-ink-3: #6b7280;
  --emboss-ink-4: #9ca3af;
  --emboss-ink-5: #d1d5db;

  /* Bar track */
  --emboss-track: #e8ecf1;
  --emboss-track-radius: 13px;

  /* Bar fills — grayscale */
  --emboss-fill-active: linear-gradient(90deg, #4b5563, #6b7280);
  --emboss-fill-done: linear-gradient(90deg, #9ca3af, #a3a3a3);
  --emboss-fill-upcoming: linear-gradient(90deg, #9ca3af, #a3a3a3);

  /* Opacity hierarchy */
  --emboss-opacity-done: 0.45;
  --emboss-opacity-upcoming: 0.5;

  /* Today */
  --emboss-today: #ef4444;

  /* Dimensions */
  --emboss-row-h: 44px;
  --emboss-bar-h: 26px;
  --emboss-bar-r: 13px;
  --emboss-day-w: 32px;
  --emboss-sidebar-w: 280px;
  --emboss-label-size: 11.5px;
  --emboss-grid-opacity: 0.04;
}

/* Dark theme — applied via .emboss-dark class on container */
.emboss-dark {
  --emboss-bg: #0f1117;
  --emboss-surface: #1a1d23;
  --emboss-surface-2: #1f222b;
  --emboss-border: #2a2d36;
  --emboss-ink: #e5e7eb;
  --emboss-ink-2: #d1d5db;
  --emboss-ink-3: #9ca3af;
  --emboss-ink-4: #6b7280;
  --emboss-ink-5: #374151;
  --emboss-track: #2a2d36;
  --emboss-today: #f87171;
}
```

**Vivid template overrides fills only:**
```css
.emboss-vivid {
  --emboss-fill-active: linear-gradient(90deg, #3b82f6, #06b6d4);
  --emboss-fill-done: linear-gradient(90deg, #34d399, #06b6d4);
  --emboss-fill-upcoming: linear-gradient(90deg, #8b5cf6, #ec4899);
}
```

---

## 7. DEPENDENCY ARROWS

Arrows are SVG paths rendered in an overlay above bars (z-index 15). They are **hidden by default** and shown when a bar is hovered.

**Routing: start-to-start.** Left edge of source → left edge of target. The path goes: horizontal left from source start to a gutter column, vertical to target row, horizontal right into target start. Right-angle routing with rounded joins.

**Status-based styling:**
- Active (source done/active, target active): solid 1.5px, `var(--emboss-ink-3)`, opacity 0.65
- Future (target upcoming): dashed (5 3), `var(--emboss-ink-4)`, opacity 0.5
- Completed (both done): solid 1.2px, `var(--emboss-ink-5)`, opacity 0.4

**Connection dots:** 2.5px radius circles at each endpoint, same color and opacity as the path.

**Hover behavior:**
1. All arrow paths and dots render with `opacity: 0` and `transition: opacity 0.2s`
2. When `state.hoveredRow` is set, arrows where `data-from` or `data-to` matches the hovered row ID get class `hi`
3. CSS rule: `svg.dep path.hi, svg.dep circle.hi { opacity: 1 }`
4. When hover ends, class is removed, arrows fade out

---

## 8. FRAPPE GANTT MAPPING

This is what you keep from Frappe and what you replace.

**KEEP (the engine):**
- Date math utilities (date arithmetic, working days, snapping)
- Day-to-pixel coordinate mapping
- Drag event handling (mousedown/mousemove/mouseup lifecycle)
- Dependency resolution (which tasks depend on which)
- View mode logic (scaling calculations)
- SVG container setup

**REPLACE (the visual layer):**
- All CSS → Emboss design system via custom properties
- Bar rendering → glass track/fill/marker model
- Arrow rendering → start-to-start right-angle routing, hover-only
- Popup → removed (tooltips extension replaces it)
- Header → view-mode-aware header renderer
- All hardcoded markup → renderer contract outputs

**RESTRUCTURE (the architecture):**
- Flat task array → Row model with type/depth/parentId
- Monolithic class → core engine + extension registration + renderer pipeline
- Global CSS → scoped `.emboss-` classes + custom properties
- Direct DOM manipulation → state → render cycle

---

## 9. VISUAL SPECIFICATION

Reference these exact values when implementing renderers.

### 9.1 Glass Bar

The bar is two layers: track (full width) and fill (progress width).

**Track:** Full width of task duration. Background: `var(--emboss-track)`. Height: `var(--emboss-bar-h)`. Radius: `var(--emboss-bar-r)`.

**Fill:** Width = `max(14px, barWidth × progress / 100)`. Background: status gradient from CSS vars. Radius: `var(--emboss-bar-r) 0 0 var(--emboss-bar-r)` (left-rounded). At 100%: full radius.

**Glass highlight on fill:** `::before` pseudo-element. Top 2px, inset 4px left/right, height 40%. Gradient: `rgba(255,255,255,0.5)` at top → `rgba(255,255,255,0.12)` at middle → transparent. Rounded.

**Shadow on fill:** `::after` pseudo-element. Bottom 0, full width, height 35%. Gradient: `rgba(0,0,0,0.1)` at bottom → transparent. Creates dimensionality.

**Progress marker dot:** 12px white circle, 2px white ring shadow, inner 6px circle in status color. Positioned at fill edge, vertically centered. Hidden at 0% and 100%. Scale 1.15× on bar hover.

**Upcoming bars at 0%:** Fill covers full width at `var(--emboss-opacity-upcoming)`. Label inside in white at 75% opacity.

**Done bars:** Entire bar at `var(--emboss-opacity-done)`. Hover raises to 65%.

### 9.2 Labels

- **Inside bar** (bar > 70px): Left 10px, white, text-shadow `0 1px 2px rgba(0,0,0,.2)`, `var(--emboss-label-size)`
- **Outside bar** (bar ≤ 70px): Left = barWidth + 6px, `var(--emboss-ink-4)`, same size
- Always show task name. Show progress % for partial (between 1–99%).
- Upcoming 0%: inside, white at 75% opacity.
- Done 100%: inside, white (on the full fill).

### 9.3 Today Marker

- **Line:** 1.5px, `var(--emboss-today)`, opacity 0.5, z-index 20, full chart height
- **Dot:** 8px circle, solid `var(--emboss-today)`, centered on line top, z-index 25
- **Ring:** 16px circle, `var(--emboss-today)` at 15% opacity, pulses scale(1)→scale(1.6) over 2s infinite
- **Glow:** ~40px column, `var(--emboss-today)` at 4% opacity, z-index 1
- **Label:** "TODAY" in monospace, 8px, above dot

### 9.4 Milestones

- 20×20px square rotated 45°, 3px radius on corners
- 2.5px border in phase color
- Background: `var(--emboss-surface)`
- Progress fill: bottom-to-top inside the diamond
- Glass highlight: top 50% white gradient
- Hover: scale 1.2×
- Done: 45% opacity

### 9.5 Drag Handles

- 3×55% height, 2px radius, `rgba(255,255,255, 0.4)`
- Left handle: 4px from left edge. Right handle: 4px from right edge.
- Hidden by default, visible on bar hover (opacity transition 0.15s)
- Hidden entirely in presentation density
- Active (during drag): 1.5px border in bar's status color

### 9.6 Sidebar (Organize extension)

- **Full mode:** `var(--emboss-sidebar-w)` width. Task rows with status dot + name + assignee avatar.
- **Rail mode:** 48px. Phase pills (30×30px, phase color, centered letter). Task dots (8×8px).
- **Collapse button:** 24×24px, top-right of sidebar header. ◀ / ▶.
- **Phase rows:** Chevron (rotates on collapse) + colored pill + name + task count badge.
- **Font sizes:** Phase name 13px weight 600. Task name 12.5px. Milestone name 12.5px italic.

### 9.7 Dark Mode

Applied via `.emboss-dark` class on the container element. All colors reference CSS custom properties that swap values (see Section 6). Specific notes:

- Track becomes `#2a2d36` (subtle, not invisible)
- Glass highlight stays — white at lower opacity still reads on dark
- Fills pop more against dark background — this is a feature
- Today marker shifts to `#f87171` (slightly lighter red)
- Tooltips invert: light background `var(--emboss-ink)` on dark, dark text

### 9.8 Settings (Gear Menu)

Behind a ⚙ icon in the toolbar. Dropdown menu with:
- **Weekends section:** "Mark weekends" toggle, "Exclude weekends" toggle
- **Holidays section:** "Mark a holiday" date input, "Ignore a day" date input
- Toggles are 34×18px pill switches, blue when active
- Menu: 240px min-width, 10px padding, 10px border-radius, shadow

---

## 10. BUILD PHASES

Each phase produces a working, testable artifact. Never build ahead — each phase's output is the input for the next.

### Phase 1 — Fork & Gut (Target: 1 week)

**Input:** Frappe Gantt v1 source.
**Output:** Stripped engine with Row model, State object, and render cycle.

Steps:
1. Fork Frappe Gantt repo
2. Define `Row` type and `EmbossState` type (from Section 1 and 2)
3. Replace Frappe's task array with `Row[]`
4. Strip all CSS, all bar SVG markup, all popup code
5. Keep: date math, day↔pixel mapping, drag mousedown/mousemove/mouseup, dependency resolution, view mode scaling
6. Implement state mutation methods (`setView`, `updateRow`, `toggleCollapse`)
7. Implement basic render cycle: state change → recalculate → call renderers → update DOM
8. Implement extension registration (`emboss.use(extension)`)
9. **Test:** Create an Emboss instance with raw task data. It should render nothing visible but the coordinate system should work — you can query where row 3 would be positioned.

### Phase 2 — Core Visual Layer (Target: 2 weeks)

**Input:** Phase 1 engine.
**Output:** Beautiful grayscale bars, grid, header, drag handles. Looks like a complete (minimal) Gantt chart.

Steps:
1. Implement core `BarRenderer` for `type === 'task'` — glass track/fill/marker (Section 9.1)
2. Implement label positioning logic (Section 9.2)
3. Implement `HeaderRenderer` for all four view modes (Section 3.3)
4. Implement grid lines (week lines, month boundaries)
5. Implement drag handles (Section 9.5)
6. Wire drag events to state updates
7. Implement CSS custom properties (Section 6 — grayscale light values)
8. Implement dark theme (`.emboss-dark` class swap + dark property values)
9. Implement density modes (working/presentation/dense scale values from Section 2)
10. **Test:** Render 10 tasks in grayscale. Drag to reschedule. Switch views. Toggle dark mode. All works.

### Phase 3 — Free Extensions (Target: 3 days)

**Input:** Phase 2 chart.
**Output:** Today marker, hover tooltips, dependency arrows.

Steps:
1. Implement `todayMarker` extension (Section 9.3)
2. Implement `tooltips` extension (Section 9.6 of original spec — dark card, cursor-following, boundary detection)
3. Implement dependency arrow SVG rendering (Section 7 — start-to-start, hover-only)
4. Wire hover state: bar hover → `state.hoveredRow` → arrow visibility
5. **Test:** Hover a bar with dependencies. Arrows appear. Move away. Arrows fade. Tooltip follows cursor. Today line pulses.

### Phase 4 — Extension API Hardening (Target: 3 days)

**Input:** Three working extensions.
**Output:** Proven extension API that composes correctly.

Steps:
1. Verify extension registration order works (later overrides earlier)
2. Verify `enrichRows` pipeline works (multiple extensions enriching same rows)
3. Verify renderers from different extensions don't conflict
4. Verify event handlers from multiple extensions all fire
5. Write the `EmbossExtension` TypeScript interface as the public API contract
6. Document: "How to write an Emboss extension" — 1 page, with code example
7. **Test:** Register all three free extensions. Everything composes. Remove one. Others still work. Add a custom extension. It slots in.

### Phase 5 — Organize Bundle (Target: 2 weeks)

**Input:** Proven extension API.
**Output:** Sidebar, phase grouping, milestones, collapse, inline editing.

Steps:
1. Implement `sidebar` extension — creates sidebar container, renders per-row cells (Section 9.6)
2. Implement `phases` extension — adds phase row type, phase header renderer, collapse logic
3. Implement `milestones` extension — diamond bar renderer (Section 9.4)
4. Implement `inlineEditing` extension — click-to-edit on phase names, phase-colored border
5. Implement rail mode (48px sidebar with pill icons)
6. Implement sidebar collapse button
7. Sync sidebar scroll with chart scroll
8. **Test:** Load tasks with phases. Sidebar shows. Collapse a phase. Milestones render. Edit a name. Switch to rail. Everything works with all free extensions simultaneously.

### Phase 6 — Package & License (Target: 3 days)

**Input:** Complete core + free extensions + Organize bundle.
**Output:** Published `@emboss/core` on npm with soft license enforcement.

Steps:
1. Structure package per Section 3.2 of original spec (core/, extensions/, templates/)
2. Implement `license.js` — checks for `licenseKey` in config, logs console warning if paid features used without key
3. Write package.json, README, TypeScript declarations
4. Publish to npm
5. **Test:** `npm install @emboss/core`, import core only — works, no warnings. Import Organize without key — works but logs warning. Import with key — clean.

---

## 11. WHAT NOT TO BUILD

These are explicitly out of scope for the initial build. Do not implement them even if they seem easy or obvious:

- **Swimlane/resource view** (Team bundle — later)
- **Critical path algorithm** (Analyze bundle — later)
- **Baseline comparison** (Analyze bundle — later)
- **Export PDF/PNG** (Analyze bundle — later)
- **Vivid template** (paid template — later, but CSS vars make it trivial)
- **Subtask nesting** (Subtask pack — later)
- **Server-side license validation** (never)
- **React/Vue/Svelte wrappers** (community can do this)
- **Undo/redo** (nice to have, not in v1)
- **Keyboard navigation** (important for accessibility, but Phase 2 of the product, not the library)
- **Roadmap view** (future Leantime feature)

---

## 12. FILE STRUCTURE

When building, create files that map to contracts:

```
src/
├── core/
│   ├── index.ts              ← Emboss class, state, render cycle
│   ├── types.ts              ← Row, EmbossState, Scale, EmbossExtension, EmbossEvents
│   ├── state.ts              ← State management, mutation methods
│   ├── renderers/
│   │   ├── bar.ts            ← Core BarRenderer (glass bars)
│   │   ├── header.ts         ← Core HeaderRenderer (all 4 view modes)
│   │   └── grid.ts           ← Grid lines, weekend markers
│   ├── drag.ts               ← Drag event handling (from Frappe)
│   ├── dates.ts              ← Date math utilities (from Frappe)
│   └── themes/
│       ├── grayscale.css     ← Light theme custom properties
│       └── dark.css          ← Dark theme overrides
├── extensions/
│   ├── free/
│   │   ├── today-marker.ts
│   │   ├── tooltips.ts
│   │   └── dependency-arrows.ts
│   └── paid/
│       └── organize/
│           ├── sidebar.ts
│           ├── phases.ts
│           ├── milestones.ts
│           └── inline-edit.ts
├── license.ts                ← Soft enforcement
└── index.ts                  ← Package entry, re-exports
```

Every `.ts` file exports one thing that maps to one contract from this document. If a file needs to know about more than two sections of this spec, it's doing too much — split it.
