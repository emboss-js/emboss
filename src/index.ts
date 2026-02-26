/**
 * @emboss-js/core — index.ts (package entry)
 *
 * Usage:
 *   import { Emboss, todayMarker, tooltips, dependencyArrows } from '@emboss-js/core'
 *
 * Paid extensions via sub-path imports:
 *   import { sidebar, milestones } from '@emboss-js/core/extensions/organize'
 *   import { columns } from '@emboss-js/core/extensions/columns'
 */

export { Emboss } from './core/index'
export type { EmbossConfig } from './core/index'
export type {
  Row,
  EmbossState,
  Scale,
  EmbossExtension,
  EmbossInstance,
  EmbossEvents,
  RowUpdate,
  SidebarRenderer,
  BarRenderer,
  HeaderRenderer,
} from './core/types'

// Free extensions — named exports
export { todayMarker, tooltips, dependencyArrows } from './extensions/free/index'

// License
export { setLicense } from './license'
