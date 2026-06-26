// Date utilities using dayjs for formatting and validation
// All dates are stored as Unix timestamps (numbers in seconds)

import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// Extend dayjs with plugins
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * Format a Unix timestamp to a readable string
 * @param timestamp - Unix timestamp in seconds
 * @param format - Format type or custom format string
 * @returns Formatted date string
 */
export function formatDate(
  timestamp: number,
  format: 'short' | 'long' | 'full' | 'iso' | 'time' | string = 'short'
): string {
  if (!timestamp || !isValidTimestamp(timestamp)) return 'Invalid Date'

  const date = dayjs.unix(timestamp)

  switch (format) {
    case 'short':
      // e.g., "2024/01/15"
      return date.format('YYYY/MM/DD')

    case 'long':
      // e.g., "15 January 2024"
      return date.format('DD MMMM YYYY')

    case 'full':
      // e.g., "Monday, 15 January 2024"
      return date.format('dddd, DD MMMM YYYY')

    case 'iso':
      // e.g., "2024-01-15"
      return date.format('YYYY-MM-DD')

    case 'time':
      // e.g., "14:30"
      return date.format('HH:mm')

    default:
      // Custom format string
      return date.format(format)
  }
}

/**
 * Format a Unix timestamp with date and time
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted date and time string
 */
export function formatDateTime(timestamp: number): string {
  if (!timestamp || !isValidTimestamp(timestamp)) return 'Invalid Date'

  return dayjs.unix(timestamp).format('DD MMM YYYY, HH:mm')
}

/**
 * Get month name from month number
 * @param month - Month number (1-12)
 * @param format - Format type
 * @returns Month name
 */
export function getMonthName(
  month: number,
  format: 'short' | 'long' = 'long'
): string {
  if (!isValidMonth(month)) return 'Invalid Month'

  const date = dayjs().month(month - 1)
  return format === 'short' ? date.format('MMM') : date.format('MMMM')
}

/**
 * Get all month names
 * @param format - Format type
 * @returns Array of month names
 */
export function getAllMonthNames(format: 'short' | 'long' = 'long'): string[] {
  return Array.from({ length: 12 }, (_, i) => getMonthName(i + 1, format))
}

/**
 * Get current year
 * @returns Current year number
 */
export function getCurrentYear(): number {
  return dayjs().year()
}

/**
 * Get current month (1-12)
 * @returns Current month number
 */
export function getCurrentMonth(): number {
  return dayjs().month() + 1
}

/**
 * Get current Unix timestamp in seconds
 * @returns Current Unix timestamp
 */
export function getCurrentTimestamp(): number {
  return dayjs().unix()
}

/**
 * Create a Unix timestamp from date components
 * @param year - Year
 * @param month - Month (1-12)
 * @param day - Day of month (default: 1)
 * @returns Unix timestamp in seconds
 */
export function createTimestamp(year: number, month: number, day: number = 1): number {
  return dayjs()
    .year(year)
    .month(month - 1)
    .date(day)
    .startOf('day')
    .unix()
}

/**
 * Validate if a timestamp is valid
 * @param timestamp - Unix timestamp in seconds
 * @returns True if valid
 */
export function isValidTimestamp(timestamp: number): boolean {
  if (!timestamp || typeof timestamp !== 'number') return false

  const date = dayjs.unix(timestamp)
  return date.isValid() && timestamp > 0
}

/**
 * Validate if a year is valid
 * @param year - Year to validate
 * @returns True if valid
 */
export function isValidYear(year: number): boolean {
  const currentYear = getCurrentYear()
  return year >= 2000 && year <= currentYear + 10
}

/**
 * Validate if a month is valid
 * @param month - Month to validate (1-12)
 * @returns True if valid
 */
export function isValidMonth(month: number): boolean {
  return month >= 1 && month <= 12
}

/**
 * Generate a month display name
 * @param monthName - Custom month name
 * @param year - Year
 * @param month - Month number (1-12)
 * @returns Display name like "January 2024" or custom name
 */
export function generateMonthDisplayName(
  monthName: string | null,
  year: number,
  month: number
): string {
  if (monthName && monthName.trim()) {
    return monthName.trim()
  }
  return `${getMonthName(month)} ${year}`
}

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param timestamp - Unix timestamp in seconds
 * @returns Relative time string
 */
export function getRelativeTime(timestamp: number): string {
  if (!timestamp || !isValidTimestamp(timestamp)) return 'Invalid Date'

  return dayjs.unix(timestamp).fromNow()
}

/**
 * Check if a timestamp is today
 * @param timestamp - Unix timestamp in seconds
 * @returns True if timestamp is today
 */
export function isToday(timestamp: number): boolean {
  if (!isValidTimestamp(timestamp)) return false

  const date = dayjs.unix(timestamp)
  const today = dayjs()

  return date.isSame(today, 'day')
}

/**
 * Check if a timestamp is in the past
 * @param timestamp - Unix timestamp in seconds
 * @returns True if timestamp is in the past
 */
export function isPast(timestamp: number): boolean {
  if (!isValidTimestamp(timestamp)) return false

  return dayjs.unix(timestamp).isBefore(dayjs())
}

/**
 * Check if a timestamp is in the future
 * @param timestamp - Unix timestamp in seconds
 * @returns True if timestamp is in the future
 */
export function isFuture(timestamp: number): boolean {
  if (!isValidTimestamp(timestamp)) return false

  return dayjs.unix(timestamp).isAfter(dayjs())
}

/**
 * Get year range for dropdowns
 * @param startOffset - Years before current year (default: 2)
 * @param endOffset - Years after current year (default: 5)
 * @returns Array of years
 */
export function getYearRange(startOffset: number = 2, endOffset: number = 5): number[] {
  const currentYear = getCurrentYear()
  const startYear = currentYear - startOffset
  const endYear = currentYear + endOffset

  return Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i
  )
}

/**
 * Parse a date string to Unix timestamp
 * @param dateString - Date string in various formats
 * @returns Unix timestamp in seconds or null if invalid
 */
export function parseDate(dateString: string): number | null {
  if (!dateString || typeof dateString !== 'string') return null

  const date = dayjs(dateString)
  return date.isValid() ? date.unix() : null
}

/**
 * Add days to a timestamp
 * @param timestamp - Unix timestamp in seconds
 * @param days - Number of days to add (can be negative)
 * @returns New Unix timestamp
 */
export function addDays(timestamp: number, days: number): number {
  if (!isValidTimestamp(timestamp)) return getCurrentTimestamp()

  return dayjs.unix(timestamp).add(days, 'day').unix()
}

/**
 * Add months to a timestamp
 * @param timestamp - Unix timestamp in seconds
 * @param months - Number of months to add (can be negative)
 * @returns New Unix timestamp
 */
export function addMonths(timestamp: number, months: number): number {
  if (!isValidTimestamp(timestamp)) return getCurrentTimestamp()

  return dayjs.unix(timestamp).add(months, 'month').unix()
}

/**
 * Add years to a timestamp
 * @param timestamp - Unix timestamp in seconds
 * @param years - Number of years to add (can be negative)
 * @returns New Unix timestamp
 */
export function addYears(timestamp: number, years: number): number {
  if (!isValidTimestamp(timestamp)) return getCurrentTimestamp()

  return dayjs.unix(timestamp).add(years, 'year').unix()
}

/**
 * Get the difference in days between two timestamps
 * @param timestamp1 - First Unix timestamp in seconds
 * @param timestamp2 - Second Unix timestamp in seconds
 * @returns Difference in days
 */
export function diffInDays(timestamp1: number, timestamp2: number): number {
  if (!isValidTimestamp(timestamp1) || !isValidTimestamp(timestamp2)) return 0

  const date1 = dayjs.unix(timestamp1)
  const date2 = dayjs.unix(timestamp2)

  return date1.diff(date2, 'day')
}

/**
 * Get the difference in months between two timestamps
 * @param timestamp1 - First Unix timestamp in seconds
 * @param timestamp2 - Second Unix timestamp in seconds
 * @returns Difference in months
 */
export function diffInMonths(timestamp1: number, timestamp2: number): number {
  if (!isValidTimestamp(timestamp1) || !isValidTimestamp(timestamp2)) return 0

  const date1 = dayjs.unix(timestamp1)
  const date2 = dayjs.unix(timestamp2)

  return date1.diff(date2, 'month')
}

/**
 * Get the start of day for a timestamp
 * @param timestamp - Unix timestamp in seconds
 * @returns Unix timestamp at start of day
 */
export function startOfDay(timestamp: number): number {
  if (!isValidTimestamp(timestamp)) return getCurrentTimestamp()

  return dayjs.unix(timestamp).startOf('day').unix()
}

/**
 * Get the end of day for a timestamp
 * @param timestamp - Unix timestamp in seconds
 * @returns Unix timestamp at end of day
 */
export function endOfDay(timestamp: number): number {
  if (!isValidTimestamp(timestamp)) return getCurrentTimestamp()

  return dayjs.unix(timestamp).endOf('day').unix()
}

/**
 * Check if two timestamps are on the same day
 * @param timestamp1 - First Unix timestamp in seconds
 * @param timestamp2 - Second Unix timestamp in seconds
 * @returns True if same day
 */
export function isSameDay(timestamp1: number, timestamp2: number): boolean {
  if (!isValidTimestamp(timestamp1) || !isValidTimestamp(timestamp2)) return false

  const date1 = dayjs.unix(timestamp1)
  const date2 = dayjs.unix(timestamp2)

  return date1.isSame(date2, 'day')
}

/**
 * Check if a timestamp is between two other timestamps
 * @param timestamp - Unix timestamp to check
 * @param start - Start Unix timestamp
 * @param end - End Unix timestamp
 * @returns True if timestamp is between start and end
 */
export function isBetween(timestamp: number, start: number, end: number): boolean {
  if (!isValidTimestamp(timestamp) || !isValidTimestamp(start) || !isValidTimestamp(end)) {
    return false
  }

  const date = dayjs.unix(timestamp)
  const startDate = dayjs.unix(start)
  const endDate = dayjs.unix(end)

  return date.isAfter(startDate) && date.isBefore(endDate)
}
