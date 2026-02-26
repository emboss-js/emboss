# AGENTS.md — AI Agent Instructions for Emboss

Emboss is a Gantt chart library published as `@emboss-js/core`. Open-core model: free base + paid Organize bundle.

## Architecture

- **Everything is a Row.** Tasks, phases, milestones, subtasks — all one `Row` type with a `type` field. No subclasses. See `src/core/types.ts`.
- **State is singular.** `EmbossState` in `src/core/state.ts`. Extensions mutate state through `EmbossInstance` methods (`setView`, `updateRow`, etc.), never directly.
- **Extensions are plain objects.** `EmbossExtension` interface: `name`, `type`, optional renderers, optional `init(emboss)`. No plugin framework. Registration order is priority.
- **Renderers return DOM.** `BarRenderer`, `SidebarRenderer`, `HeaderRenderer` — they take data, return elements. No virtual DOM, no diffing. `innerHTML` replacement each cycle.
- **Date math comes from Frappe Gantt.** `src/core/dates.ts` and `src/core/drag.ts` are ported from Frappe v1. Don't rewrite them.

## Project Structure

```
src/
├── core/           # Free (MIT)
│   ├── index.ts    # Emboss class, render cycle, EmbossConfig
│   ├── types.ts    # Row, EmbossState, Scale, EmbossExtension, EmbossInstance, EmbossEvents
│   ├── state.ts    # createState, calcScale, recalcHidden
│   ├── dates.ts    # Date math (from Frappe)
│   ├── drag.ts     # Drag handling (from Frappe)
│   ├── renderers/  # bar.ts, header.ts, grid.ts
│   └── themes/     # grayscale.css, dark.css, vivid.css
├── extensions/
│   ├── free/       # todayMarker, tooltips, dependencyArrows
│   └── paid/
│       ├── organize/  # sidebar, phases, milestones, inlineEdit
│       └── columns/   # columns (duration + dates)
├── license.ts      # Soft enforcement — console warn, never breaks functionality
└── index.ts        # Package entry, re-exports
```

## Licensing Model

- **Free (MIT):** Core rendering, views (day/week/month/quarter), drag, grayscale + dark themes, free extensions.
- **Organize (commercial):** Density modes (dense/presentation — working is free), glass bar finish, vivid theme, sidebar, phases, milestones, inline edit, columns.
- License key format: `EMB-{FLAGS}-{YYYYMMDD}-{checksum}`. The `O` flag unlocks all Organize features including columns.
- `setDensity()` gates dense/presentation behind `checkLicense('organize')`. Working density is always free.
- Enforcement is soft: console warning, extension silently doesn't register. Never breaks the chart.

## Key Patterns

**Adding an extension:**
```ts
export const myExtension: EmbossExtension = {
  name: 'my-extension',
  type: 'free',  // or 'paid'
  bundle: 'organize',  // only if paid
  barRenderer: { task: (row, scale, state, container) => { /* return HTMLElement */ } },
  init(emboss) { /* setup, event listeners */ },
  styles: `/* injected CSS */`,
}
```

**Row height varies by type.** Phase rows use 32px in presentation mode (vs 60px for tasks). Any code positioning rows vertically must accumulate heights per-row, not multiply by a uniform `scale.rowHeight`.

**Phase color resolution:** Vivid mode assigns colors from an 8-color palette based on phase index. Child rows inherit their parent phase's color.

## Constraints

- Core + free extensions: under 3,000 lines. Organize bundle: under 1,500.
- No abstraction layers, utility classes, base classes, or factories. Plain functions, plain objects.
- Do not build: swimlanes, critical path, baseline comparison, export, subtask nesting, server-side validation, framework wrappers, undo/redo, keyboard nav.

## Testing

```bash
npm test        # vitest, 57 tests
npm run build   # tsup → dist/
```

Tests use jsdom. Test files in `test/`. License gating, extension registration, and sidebar interactions are all covered.
