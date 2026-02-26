# @emboss-js/core

**The Tiptap of Gantt charts.** Beautiful, extensible, open core.

[![npm version](https://img.shields.io/npm/v/@emboss-js/core)](https://www.npmjs.com/package/@emboss-js/core)
[![license](https://img.shields.io/npm/l/@emboss-js/core)](./LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@emboss-js/core)](https://bundlephobia.com/package/@emboss-js/core)

<!-- TODO: screenshot — hero.png: week view, grayscale theme, sidebar visible, ~6 rows -->
![Emboss Gantt chart](assets/screenshots/hero.png)

## Install

```bash
npm install @emboss-js/core
```

## Quick Start

```js
import { Emboss } from '@emboss-js/core'
import '@emboss-js/core/themes/grayscale.css'

const chart = new Emboss('#gantt', [
  { id: '1', type: 'task', name: 'Research',    start: 0,  duration: 5,  progress: 100, depth: 0, parentId: null, collapsed: false, hidden: false, status: 'done',     dependencies: [] },
  { id: '2', type: 'task', name: 'Design',      start: 5,  duration: 8,  progress: 60,  depth: 0, parentId: null, collapsed: false, hidden: false, status: 'active',   dependencies: ['1'] },
  { id: '3', type: 'task', name: 'Development', start: 13, duration: 15, progress: 0,   depth: 0, parentId: null, collapsed: false, hidden: false, status: 'upcoming', dependencies: ['2'] },
  { id: '4', type: 'milestone', name: 'Launch', start: 28, duration: 0,  progress: 0,   depth: 0, parentId: null, collapsed: false, hidden: false, status: 'upcoming', dependencies: ['3'] },
], { view: 'week' })
```

<!-- TODO: screenshot of the quick start result -->

## Features

| Core (free) | Free Extensions | Paid Extensions |
|---|---|---|
| Glass bar rendering | Today marker | **Organize** — sidebar, phases, milestones, inline edit |
| Day / week / month / quarter views | Tooltips | **Columns** — duration & dates columns |
| Dense / working / presentation density | Dependency arrows | |
| Grayscale + dark themes | | Vivid theme (included with Organize) |
| Drag to move, resize, adjust progress | | |
| Extension system | | |

## Views & Density

```js
chart.setView('day')       // day | week | month | quarter
chart.setDensity('dense')  // dense | working | presentation
```

<!-- TODO: screenshot — views.png: 4-up showing day/week/month/quarter -->
<!-- TODO: screenshot — density.png: 3-up showing dense/working/presentation -->

## Themes

**Grayscale** (default) and **Dark** are free. **Vivid** is included with the Organize bundle.

```js
// Grayscale (default)
import '@emboss-js/core/themes/grayscale.css'

// Dark
import '@emboss-js/core/themes/dark.css'
chart.setTheme('dark')

// Vivid (requires Organize license)
import '@emboss-js/core/extensions/organize/vivid.css'
chart.setTheme('vivid')
```

<!-- TODO: screenshot — dark-mode.png: same data in dark theme -->
<!-- TODO: screenshot — vivid-theme.png: vivid with colored phases + sidebar -->

## Extensions

### Free

Included in the main package — no license required.

```js
import { todayMarker, tooltips, dependencyArrows } from '@emboss-js/core/extensions/free'

const chart = new Emboss('#gantt', rows, {
  extensions: [todayMarker, tooltips, dependencyArrows],
})
```

| Extension | Description |
|---|---|
| `todayMarker` | Vertical line on the current date |
| `tooltips` | Hover tooltip with row details |
| `dependencyArrows` | SVG arrows between dependent rows |

<!-- TODO: screenshot — extensions.png: chart with today marker, tooltips, dependency arrows visible -->

### Paid

Paid extensions require a license key. Two bundles are available:

**Organize** — sidebar, phase rows, milestone rendering, inline editing.

```js
import { sidebar, phases, milestones, inlineEdit } from '@emboss-js/core/extensions/organize'
```

**Columns** — duration and date columns for the sidebar (requires Organize).

```js
import { columns } from '@emboss-js/core/extensions/columns'
```

Register with a license key:

```js
import { Emboss, setLicense } from '@emboss-js/core'
import { sidebar, phases, milestones, inlineEdit } from '@emboss-js/core/extensions/organize'
import { columns } from '@emboss-js/core/extensions/columns'

setLicense('your-license-key')

const chart = new Emboss('#gantt', rows, {
  extensions: [sidebar, phases, milestones, inlineEdit, columns],
})
```

<!-- TODO: update domain -->
[View pricing &rarr;](https://emboss-js.dev/pricing)

## Events

```js
chart.on('onDragEnd', (row, update) => {
  console.log(`${row.name} moved to day ${update.start}`)
  // return false to cancel the update
})

chart.on('onClick', (row, event) => {
  console.log(`Clicked ${row.name}`)
})
```

See [`EmbossEvents`](src/core/types.ts) for the full list of events.

## API Reference

| Method | Signature | Description |
|---|---|---|
| `setView` | `(view: 'day' \| 'week' \| 'month' \| 'quarter') => void` | Change the time scale |
| `setDensity` | `(density: 'dense' \| 'working' \| 'presentation') => void` | Change row spacing |
| `setTheme` | `(theme: string) => void` | Switch CSS theme |
| `toggleCollapse` | `(rowId: string) => void` | Expand/collapse a phase row |
| `updateRow` | `(rowId: string, changes: Partial<Row>) => void` | Update row properties |
| `addRow` | `(row: Row, afterId?: string) => void` | Insert a new row |
| `removeRow` | `(rowId: string) => void` | Delete a row |
| `use` | `(extension: EmbossExtension) => void` | Register an extension at runtime |
| `remove` | `(name: string) => void` | Unregister an extension by name |
| `on` | `(event: string, handler: Function) => void` | Subscribe to an event |
| `emit` | `(event: string, ...args: any[]) => void \| false` | Emit an event |
| `render` | `() => void` | Force a re-render |
| `destroy` | `() => void` | Tear down the chart and clean up |

Constructor:

```js
new Emboss(selector: string, rows: Row[], config?: EmbossConfig)
```

See [`EmbossInstance`](src/core/types.ts) and [`EmbossConfig`](src/core/index.ts) for full type definitions.

## License

MIT for the core library and free extensions.

Paid extensions (Organize, Columns, Vivid theme) require a license key.
<!-- TODO: update domain -->
See [emboss-js.dev/pricing](https://emboss-js.dev/pricing) for details.
