# Emboss — Product & Technical Specification

**Version:** 2.0  
**Date:** February 23, 2026  
**Authors:** Gloria, Claude  
**Status:** For review by Gloria & Marcel

---

## 1. Vision

An open-source Gantt chart library that makes project timelines beautiful through design thinking — not just color. Built on Frappe Gantt v1 mechanics, wrapped in an extension-based architecture where developers opt into the features they need.

**One sentence:** The Tiptap of Gantt charts — a beautifully designed core with opt-in extensions that solve real problems.

**Name:** Emboss — dimensional, crafted, design-forward.

---

## 2. Guiding Principles

1. **AI-friendly architecture.** Clean code, semantic variables, typed APIs, flat structure. An AI assistant should be able to extend this library on the first try.
2. **Design thinking is the product.** The free tier ships beautiful grayscale + dark themes. The value is in the decisions: dashed vs solid arrows, bottom-to-top routing, three-tier opacity hierarchy. People adopt Emboss because someone already thought through these things.
3. **Extensions, not bundles.** Everything beyond core is an opt-in extension. Developer imports what they need. Some free, some paid. Nothing forced.
4. **Frappe is MIT — respect it.** Anything that exists in Frappe v1 ships free, even redesigned. We sell new features and complete design systems, not Frappe's work.
5. **Minimal maintenance.** Every architectural decision optimizes for a 2-person part-time team. No servers, no subscriptions to manage, no license infrastructure.

---

## 3. Architecture

### 3.1 Extension-Based Model (Tiptap-style)

| Layer | Purpose | Ships as |
|-------|---------|----------|
| **Core** | Frappe v1 engine + grayscale/dark design system | `@emboss/core` (free, MIT) |
| **Free Extensions** | Opt-in features that build trust and adoption | Included in `@emboss/core`, import separately |
| **Paid Extensions** | Sold as purpose-driven bundles | Same package, license-gated |
| **Paid Templates** | Complete color/design systems | Same package, license-gated |

### 3.2 Single Package Model

Everything ships in **one npm package**. Developer imports only what they need. Paid modules produce a build-time console warning when used without a valid license key.

```
@emboss/core
├── core/              ← Engine + grayscale/dark themes (free, MIT)
│   ├── bars/
│   ├── arrows/
│   ├── drag/
│   ├── grid/
│   └── themes/
│       ├── grayscale/
│       └── dark/
├── extensions/        ← Opt-in features
│   ├── free/
│   │   ├── today-marker/
│   │   ├── dependency-dots/
│   │   └── tooltips/
│   └── paid/
│       ├── organize/      ← Sidebar, phases, milestones, collapsing, inline editing
│       ├── team/          ← Assignees, swimlanes
│       ├── analyze/       ← Critical path, baseline, export
│       └── subtasks/      ← Nested tasks
├── templates/         ← Complete design systems (paid)
│   ├── vivid/
│   ├── presentation/
│   ├── dense/
│   └── minimal/
└── license.js         ← Build-time soft check
```

**Usage example:**

```js
import { Emboss } from '@emboss/core'
import { todayMarker, tooltips, dependencyDots } from '@emboss/core/extensions/free'
import { sidebar, phases, milestones } from '@emboss/core/extensions/organize'  // paid
import { vivid } from '@emboss/core/templates/vivid'  // paid

const chart = new Emboss('#gantt', tasks, {
  extensions: [todayMarker, tooltips, dependencyDots, sidebar, phases, milestones],
  theme: vivid,
  licenseKey: 'EMBOSS-XXXX-XXXX-XXXX'
})
```

### 3.3 License Enforcement

- **Type:** Soft enforcement — build-time check only
- **Behavior:** Console warning if paid features used without valid key. Never breaks functionality.
- **Scope:** Per-project. One purchase = one project, unlimited developers.
- **Philosophy:** Trust buyers to be honest.

---

## 4. Data Model

### 4.1 Entity Hierarchy

```
Phase (container — groups work into chapters) [ORGANIZE BUNDLE]
  ├── Task (work item with duration)
  │     └── Subtask (nested work item) [SUBTASK PACK]
  └── Milestone (point-in-time gate) [ORGANIZE BUNDLE]
```

Without paid extensions, Emboss renders a flat list of tasks (like Frappe, but beautiful).

### 4.2 Task (Core — always available)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Unique identifier |
| `name` | string | yes | Display name |
| `start` | date | yes | Start date |
| `duration` | number | yes | Duration in days |
| `progress` | number | yes | 0–100 percentage |
| `status` | enum | yes | `done`, `active`, `upcoming` (3 defaults) |
| `dependencies` | string[] | no | Array of task IDs this depends on |

### 4.3 Phase [ORGANIZE BUNDLE]

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Unique identifier |
| `name` | string | yes | Inline-editable (click to type) |
| `color` | string | yes | Hex color, editable via palette popover |
| `sortOrder` | number | yes | Reorderable via drag |
| `collapsed` | boolean | no | Whether children are hidden |

**Derived:** Date range, progress (weighted avg of children).

**Inline editing:** Click name → text input with phase-colored border (not always blue). Click color dot → palette popover. Drag to reorder.

### 4.4 Task (Extended — with Organize bundle)

Additional fields available when Organize extension is active:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `phaseId` | string | yes | Parent phase |
| `children` | Subtask[] | no | [SUBTASK PACK] |

### 4.5 Milestone [ORGANIZE BUNDLE]

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Unique identifier |
| `name` | string | yes | Display name |
| `phaseId` | string | yes | Parent phase |
| `date` | date | yes | Target date |
| `progress` | number | no | 0–100, diamond fill bottom-to-top |
| `dependencies` | string[] | no | Array of task/milestone IDs |

### 4.6 Assignee [TEAM BUNDLE]

| Field | Type | Notes |
|-------|------|-------|
| `assignee` | string | Name or initials |
| `assigneeColor` | string | Auto-assigned from 8–10 color palette, consistent per person |

### 4.7 Status Enum

Three defaults ship with core: `done`, `active`, `upcoming`.

Additional statuses (`at-risk`, `blocked`, custom) available via config — the host app maps its own statuses to visual treatments. Not shown by default.

```js
// Optional: custom status mapping
statusMap: {
  'stuck': { style: 'blocked', color: '#ef4444' },
  'review': { style: 'active', color: '#f59e0b' }
}
```

---

## 5. What's in Each Tier

### 5.1 Frappe MIT Audit

These features exist in Frappe v1. Emboss redesigns them but they **must ship free** (MIT):

- Task bars with progress
- Dependency arrows (redesigned: bottom-to-top routing, status-based solid/dashed/faded)
- Drag to change dates (redesigned: visible handles, ghost bar, date tooltip)
- Drag to change progress
- View modes (Day, Week, Month, Year + custom)
- CSS theming via custom properties
- Holiday/weekend handling
- Move dependencies on drag
- Milestones via custom_class (Frappe's hacky version — basic support in core)
- Click popup (redesigned as hover tooltip in free extension)

### 5.2 Emboss Core (Free, MIT)

What you get on `npm install @emboss/core` with zero extensions:

- **Bars:** Glass track/fill model in grayscale. Done = faded, active = full, upcoming = lighter.
- **Arrows:** Status-based (solid when active, dashed when upcoming, faded when done). Bottom-to-top routing.
- **Drag:** Hover handles (inset 4px from edges), ghost bar showing original, date tooltip, snap-to-grid.
- **View modes:** Day, Week, Month, Year.
- **Themes:** Grayscale (light) + Dark mode. Both beautiful, both complete.
- **CSS API:** Full custom property theming.
- **Status styling:** Three-tier grayscale hierarchy.

This is already dramatically better than Frappe visually. A flat list of beautifully designed bars.

### 5.3 Free Extensions

Opt-in, ship in same package. Import separately.

| Extension | Why Free |
|-----------|----------|
| **Today marker** | Visual line + pulsing dot + column glow. Standard in every serious Gantt. Not having it looks broken. |
| **Dependency dots** | 4px dots on bar edges signaling "has dependency — hover to see." Solves discoverability for hover-only arrows. |
| **Hover tooltips** | Dark tooltip card on bar hover. Replaces Frappe's click popup. Shows task details, dates, progress. |

### 5.4 Paid Extensions (Bundles)

#### Organize Bundle — $79

"I have more than 10 tasks and need structure."

| Feature | Description |
|---------|-------------|
| **Sidebar** | Three states: full (300px) → rail (48px) → hidden. Resize via drag. Animated transitions. |
| **Phase grouping** | Group tasks into collapsible phases. Derived date range + progress. Phase headers with color dots. |
| **Phase collapsing** | Chevron expand/collapse with animation. "(N items)" count when collapsed. |
| **Milestones (full)** | First-class diamond type with progress fill (bottom-to-top), phase coloring, hover scale. |
| **Inline editing** | Click name → text input with phase-colored border + focus ring. Enter saves, Escape cancels. |

#### Team Bundle — $49

"Multiple people are working on this."

| Feature | Description |
|---------|-------------|
| **Assignee avatars** | 22px colored circles with initials. Auto-assigned palette (8–10 colors). Consistent per person across chart. |
| **Swimlane / Resource view** | Reorganize chart by person instead of timeline. See who's overloaded. |

#### Analyze Bundle — $79

"I need to understand what's driving the timeline."

| Feature | Description |
|---------|-------------|
| **Critical path** | Algorithm highlights longest dependency chain. Toggle on/off. Critical arrows solid red. |
| **Baseline comparison** | Overlay original plan vs current schedule. Shows where you've slipped. |
| **Export PDF/PNG** | Render chart to downloadable file. Print-optimized. Handles long timelines. |

#### Subtask Pack — $49

"Tasks have tasks inside them."

| Feature | Description |
|---------|-------------|
| **Subtask nesting** | One level deep. Collapsible. Parent progress rolls up from children. Indented in sidebar, smaller bars in chart. |

### 5.5 Paid Templates

Complete design systems — not just color overrides but spacing, typography, radius, animations, label treatment. A different visual personality.

| Template | Price | Character |
|----------|-------|-----------|
| **Vivid** | $49 | Hue-shifting gradients (blue→cyan, green→teal, purple→pink), glass highlights, phase-colored milestones, status-specific palettes |
| **Presentation** | $49 | Stakeholder-ready. 64px rows, larger bars, softened grid, minimal labels, export-optimized |
| **Dense** | $49 | PM power view. 34px rows, compact spacing, more grid, smaller elements |
| **Minimal** | $49 | Editorial. Monochrome + single accent, maximum whitespace, thin bars |
| **All templates** | $99 | |

### 5.6 Pro Bundle — $199

Everything: all paid extensions (Organize + Team + Analyze + Subtask) + all templates. Best value.

### 5.7 Pricing Summary

| Item | Price |
|------|-------|
| Emboss Core + free extensions | Free (MIT) |
| Organize Bundle | $79 |
| Team Bundle | $49 |
| Analyze Bundle | $79 |
| Subtask Pack | $49 |
| Individual template | $49 |
| All templates | $99 |
| **Pro Bundle (everything)** | **$199** |

One-time purchase. Per-project license. No subscription. Soft enforcement.

**Context:** DHTMLX Gantt charges $1,169–$11,199. Bryntum Gantt is $2,695+. Our Pro bundle at $199 is an order of magnitude cheaper with better design.

---

## 6. Design System

### 6.1 Core Design (Grayscale + Dark)

The free tier is beautiful through design thinking, not color:

**Bars:** Glass track/fill model. Track is `#e8ecf1`. Fill is grayscale gradient with glass highlight (white gradient upper 40%, rounded inset). Progress marker dot (12px white circle, 6px gray center). 26px height, 13px radius.

**Status hierarchy (grayscale):**
- Done: 45% opacity, faded
- Active: full opacity, darkest fill
- Upcoming: 70% opacity, lighter fill

**Arrows:**
- Active dependency (source done/active, target active): solid 1px, `#6b7280`, opacity 0.5
- Future dependency (target upcoming): dashed (4 3), `#9ca3af`, opacity 0.35
- Completed (both done): solid, `#d1d5db`, opacity 0.25
- Routing: bottom-center of source → S-curve → top-center of target (always flows downward)
- Connection dots: 3.5px, opacity 0.7 (darker than previous spec)

**Dependency indicator dots on bars:**
- 4px dot at connection edge of bar
- Left edge = has incoming dependency
- Right edge = has outgoing dependency
- Color: `--ink4` in default state
- Brightens on hover when arrow appears

**Today marker:**
- Line: 1.5px, `#ef4444`, opacity 0.5, z-index 20 (above bars and milestones)
- Dot: 8px solid `#ef4444`, centered on line. z-index 25.
- Ring: 16px, `#ef4444` at 15% opacity, pulses scale(1)→scale(1.6), 2s infinite
- Column glow: ~40px width, rgba(239,68,68,.04), z-index 1

**Z-index stack:**
1. Column glow (1)
2. Grid lines (2)
3. Bars and milestones (10)
4. Dependency arrows (15)
5. Today line (20)
6. Today dot (25)
7. Tooltips (1000)

**Drag handles:**
- 6×18px, radius 3px, rgba(255,255,255,.9), shadow
- Inset 4px from bar edges (not flush)
- Active (dragging): border matches bar status color (1.5px solid)
- Left handle: resize start date. Right handle: resize duration.

### 6.2 Vivid Template (Paid)

Unlocks the full color world on top of the same structural design:

- Active: `linear-gradient(90deg, #3b82f6, #06b6d4)` — blue→cyan
- Done: `linear-gradient(90deg, #34d399, #06b6d4)` — emerald→teal at 45% opacity
- Upcoming: `linear-gradient(90deg, #8b5cf6, #ec4899)` — purple→pink at 55% opacity
- Glass highlight on fill with hue-shifting
- Phase-colored milestones, sidebar pills, arrow accents
- Status-specific shadows and hover treatments

### 6.3 Inline Editing (Organize Bundle)

- Trigger: click on phase name text
- Input border: `1px solid {phaseColor}` (matches phase, not always blue)
- Focus ring: `0 0 0 3px {phaseColor at 12% opacity}`
- Border radius: 6px
- Font: same as phase name (13px, weight 600)
- Save: Enter or blur
- Cancel: Escape → restores original

### 6.4 Tooltip System (Free Extension)

Dark card (`var(--ink)` background, 10px radius, 14px 16px padding, 240px width).

**Content:** Phase name (9px uppercase), task name (13px bold white), status dot + label, date range + duration, owner (if exists), mini progress bar (4px, status gradient), dependency chain (border-top divider, → prefix).

**Positioning:** 16px below cursor, 8px right. Follows mouse. Boundary detection (flips above near bottom, shifts left near right edge). 200ms appear delay. Fade in 0.15s. 80ms fade-out delay. z-index 1000. pointer-events none.

---

## 7. Leantime Integration

### 7.1 Scope

The library defines Task (core), Phase, Milestone, Subtask (extensions). Leantime maps its internal structures to these entities. The library doesn't know about Leantime's schema.

### 7.2 Leantime Needs

Leantime currently has no Phase concept. Adding it is part of the work: a `phase` field on projects with name, color, sort order. Date range and progress derived from children.

### 7.3 Integration Layer

Thin PHP adapter transforms Leantime data → Emboss JSON. HTMX handles updates (drag triggers `hx-post` to save).

### 7.4 Leantime Bundles Needed

Leantime's integration would use: Organize (sidebar, phases, milestones, editing) + Team (assignees) + Vivid template. That's the Organize Bundle ($79) + Team Bundle ($49) + Vivid ($49) = $177, or Pro Bundle ($199) for everything.

Since Leantime is the first customer and Gloria's project, this is effectively the integration test for the bundle model.

---

## 8. Build Roadmap

### Phase 1: Core Library (Months 1–3)

- Fork Frappe v1, restructure into extension architecture
- Build core: grayscale + dark themes, glass bars, smart arrows, drag handles
- Build free extensions: today marker, dependency dots, tooltips
- Build Organize bundle: sidebar, phases, milestones, collapsing, inline editing
- Ship to npm as `@emboss/core`
- Integrate with Leantime

### Phase 2: Premium & Launch (Months 3–6)

- Build paid templates: Vivid, Presentation, Dense, Minimal
- Build Team bundle: assignees, swimlanes
- Build Analyze bundle: critical path, baseline, export
- Build Subtask pack
- License key system
- Static website with live demos
- Payment platform integration (Lemon Squeezy / Paddle / Gumroad)
- Documentation
- Launch (Product Hunt, Hacker News)

### Phase 3: Sustain (Ongoing)

- Community PRs and bug fixes
- New templates/components quarterly
- Target: $5–10K/month

---

## 9. Open Questions

- [x] ~~Library name~~ → **Emboss**
- [ ] Payment platform selection
- [ ] Exact Leantime data model mapping for phases
- [ ] Whether basic sidebar (full + hidden, no rail) should be free or keep all sidebar in Organize bundle
- [ ] Whether basic phase grouping (headers, no collapsing) should be free or keep all phases in Organize bundle
- [ ] Stakeholder bundle concept (Presentation template + export + read-only mode as a bundle vs separate)

---

## Appendix A: Design Mockup Versions

| Version | File | Key Changes |
|---------|------|-------------|
| v1 | gantt-design-explorer.html | Three density modes |
| v2 | gantt-design-v2.html | Collapsible phases/sidebar |
| v3 | gantt-design-v3.html | Dependencies, subtasks, drag |
| v4 | gantt-design-v4.html | Comprehensive rebuild |
| v5 | gantt-design-v5.html | Track-and-fill bars |
| v6 | gantt-design-v6.html | Single object bars |
| v7 | gantt-design-v7.html | Glass bars, hue-shift, tooltips |

## Appendix B: Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Name | Emboss | Dimensional, crafted, design-forward |
| Architecture | Tiptap-style extensions | Developer opts in to what they need |
| Free tier | Grayscale + dark, not vivid | Design thinking is free. Color systems are premium. |
| Assignees | Team Bundle (paid) | Not in Frappe. Not standard Gantt. Enhancement. |
| Status enum | 3 defaults (done/active/upcoming) | At-risk/blocked opt-in via config |
| Arrow routing | Bottom-to-top | Eliminates horizontal spaghetti |
| Arrow style | Solid/dashed/faded by status | Active clear, future suggested, done fades |
| Arrows visibility | On hover (like Leantime) + dot indicators on bars | Clean default, discoverable |
| Today marker z-index | Above bars/milestones | Most important temporal reference |
| Today dot | Centered + outer ring pulse | Presence without garish blinking |
| Drag handles | Inset 4px from edges | Clear gap from bar's rounded ends |
| Handle active state | Status-colored border | Matches bar being dragged |
| Input border | Phase-colored | Visual thread from color dot to editing state |
| Pricing | Purpose-driven bundles | People buy solutions, not features |
| Premium delivery | Single package + license key | Zero infra |
| License enforcement | Soft (console warning) | Never breaks functionality |
