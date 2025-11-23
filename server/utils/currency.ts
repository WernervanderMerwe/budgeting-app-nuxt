/**
 * Convert cents to rands (divide by 100)
 */
export function centsToRands(cents: number): number {
  return cents / 100
}

/**
 * Convert rands to cents (multiply by 100)
 */
export function randsToCents(rands: number): number {
  return Math.round(rands * 100)
}

/**
 * Format currency for display
 */
export function formatCurrency(cents: number): string {
  const rands = centsToRands(cents)
  return `R ${rands.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
