/**
 * @emboss/core — index.ts (package entry)
 *
 * Usage:
 *   import { Emboss, todayMarker, tooltips, dependencyArrows } from '@emboss/core'
 *   import { organize } from '@emboss/core'
 *
 * Sub-path imports also work:
 *   import { todayMarker } from '@emboss/core/extensions/free'
 *   import { sidebar, milestones } from '@emboss/core/extensions/organize'
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

// Organize bundle — named export
export * as organize from './extensions/paid/organize/index'

// License
export { setLicense } from './license'
