// Client-side currency utilities for formatting and parsing

/**
 * Format a number (in rands) as currency string
 * @param amount - Amount in rands (decimal)
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  options: {
    showSymbol?: boolean
    showDecimals?: boolean
    locale?: string
  } = {}
): string {
  const {
    showSymbol = true,
    showDecimals = true,
    locale = 'en-ZA'
  } = options

  const formatter = new Intl.NumberFormat(locale, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'ZAR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  })

  return formatter.format(amount)
}

/**
 * Parse a currency string to a number (in rands)
 * Handles various input formats: "R 1,234.56", "1234.56", "1 234,56"
 * @param value - Currency string to parse
 * @returns Parsed number in rands, or 0 if invalid
 */
export function parseCurrency(value: string): number {
  if (!value || typeof value !== 'string') return 0

  // Remove currency symbols and letters
  let cleaned = value.replace(/[R$€£¥₹]/g, '').trim()

  // Remove spaces
  cleaned = cleaned.replace(/\s+/g, '')

  // Handle different decimal separators
  // If there's a comma followed by exactly 2 digits at the end, treat it as decimal separator
  if (/,\d{2}$/.test(cleaned)) {
    // European format: 1.234,56 -> 1234.56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } else {
    // US format: 1,234.56 -> 1234.56
    cleaned = cleaned.replace(/,/g, '')
  }

  const parsed = parseFloat(cleaned)
  if (isNaN(parsed)) return 0
  // Round to 2 decimal places to ensure no precision issues
  return Math.round(parsed * 100) / 100
}

/**
 * Format currency for input fields (without symbol, for editing)
 * @param amount - Amount in rands
 * @returns String formatted for input
 */
export function formatCurrencyInput(amount: number): string {
  if (amount === 0) return ''
  return amount.toFixed(2)
}

/**
 * Validate if a string is a valid currency amount
 * @param value - String to validate
 * @returns True if valid currency format
 */
export function isValidCurrency(value: string): boolean {
  if (!value || typeof value !== 'string') return false

  const parsed = parseCurrency(value)
  return !isNaN(parsed) && parsed >= 0
}

/**
 * Convert cents to rands (for displaying values from API)
 * @param cents - Amount in cents
 * @returns Amount in rands
 */
export function centsToRands(cents: number): number {
  return cents / 100
}

/**
 * Convert rands to cents (for sending values to API)
 * @param rands - Amount in rands
 * @returns Amount in cents
 */
export function randsToCents(rands: number): number {
  return Math.round(rands * 100)
}

/**
 * Format a percentage
 * @param value - Decimal value (e.g., 0.75 for 75%)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Calculate percentage of total
 * @param amount - Part amount
 * @param total - Total amount
 * @returns Decimal percentage (0-1)
 */
export function calculatePercentage(amount: number, total: number): number {
  if (total === 0) return 0
  return amount / total
}

/**
 * Format currency with color based on positive/negative
 * @param amount - Amount in rands
 * @returns Object with formatted string and color class
 */
export function formatCurrencyWithColor(amount: number): {
  formatted: string
  colorClass: string
} {
  const formatted = formatCurrency(amount)
  const colorClass = amount > 0
    ? 'text-green-600 dark:text-green-400'
    : amount < 0
    ? 'text-red-600 dark:text-red-400'
    : 'text-gray-600 dark:text-gray-400'

  return { formatted, colorClass }
}
