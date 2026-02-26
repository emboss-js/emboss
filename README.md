# Emboss

The Tiptap of Gantt charts. Beautiful, extensible, open core.

Built on [Frappe Gantt](https://github.com/nicedaycode/frappe-gantt) mechanics, wrapped in a design system and extension architecture.

## Status

🚧 **In development.** Not yet published to npm.

## Architecture

Everything is a Row. One data type, one state object, one render cycle. Extensions enrich rows and register renderers.

See [`docs/BUILD_SPEC.md`](docs/BUILD_SPEC.md) for the complete architecture contract.

## Quick Start (once published)

```js
import { Emboss } from '@emboss-js/core'
import { todayMarker, tooltips, dependencyArrows } from '@emboss-js/core/extensions/free'

const chart = new Emboss('#gantt', tasks, {
  extensions: [todayMarker, tooltips, dependencyArrows],
})
```

## Structure

```
src/
├── core/                    ← Engine + grayscale/dark themes (free, MIT)
│   ├── index.ts             ← Emboss class, state, render cycle
│   ├── types.ts             ← Row, State, Scale, Extension, Events
│   ├── state.ts             ← State management
│   ├── dates.ts             ← Date math (from Frappe)
│   ├── drag.ts              ← Drag handling (from Frappe)
│   ├── renderers/
│   │   ├── bar.ts           ← Glass bar renderer
│   │   ├── header.ts        ← Timeline header (4 view modes)
│   │   └── grid.ts          ← Grid lines
│   └── themes/
│       ├── grayscale.css    ← Light theme
│       └── dark.css         ← Dark theme
├── extensions/
│   ├── free/                ← Today marker, tooltips, dep arrows
│   └── paid/
│       └── organize/        ← Sidebar, phases, milestones, inline edit
├── license.ts               ← Soft enforcement
└── index.ts                 ← Package entry
```

## License

MIT (core + free extensions). Paid extensions require a license key — see [emboss.dev](https://emboss.dev).
