/**
 * Extract error message from $fetch error.
 * $fetch puts the API response body in error.data, not error.message.
 */
export function extractErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null) {
    return fallback
  }

  const err = error as Record<string, unknown>

  // $fetch puts response body in error.data
  if (err.data && typeof err.data === 'object') {
    const data = err.data as Record<string, unknown>
    if (typeof data.message === 'string') {
      return data.message
    }
  }

  // Fallback to error.message (generic fetch error)
  if (typeof err.message === 'string') {
    return err.message
  }

  return fallback
}
