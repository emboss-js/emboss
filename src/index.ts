/**
 * @emboss/core — index.ts (package entry)
 *
 * Usage:
 *   import { Emboss } from '@emboss/core'
 *   import { todayMarker, tooltips, dependencyArrows } from '@emboss/core/extensions/free'
 *   import { sidebar, phases, milestones } from '@emboss/core/extensions/organize'
 */

export { Emboss } from './core/index'
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
export { setLicense } from './license'
