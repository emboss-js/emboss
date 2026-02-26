/**
 * @emboss-js/core — dates.ts
 * CONTRACT: Section 8 (Frappe mapping — KEEP date math utilities)
 *
 * Date arithmetic, working days, day-to-pixel mapping.
 * Ported from Frappe Gantt v1. Pure functions, no state.
 */

export function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime()
  return Math.round(ms / 86_400_000)
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function parseDate(str: string): Date {
  return startOfDay(new Date(str))
}

// Convert day offset from project start → pixel X position
export function dayToX(dayOffset: number, dayWidth: number): number {
  return dayOffset * dayWidth
}

// Convert pixel X position → day offset (snapped to nearest day)
export function xToDay(x: number, dayWidth: number): number {
  return Math.round(x / dayWidth)
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function getMonthName(month: number, full = false): string {
  if (full) {
    return ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'][month]
  }
  return MONTH_NAMES[month]
}
