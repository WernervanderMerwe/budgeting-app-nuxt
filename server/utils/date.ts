import dayjs from 'dayjs'

/**
 * Get current Unix timestamp in seconds
 * @returns Current Unix timestamp
 */
export function getCurrentTimestamp(): number {
  return dayjs().unix()
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
