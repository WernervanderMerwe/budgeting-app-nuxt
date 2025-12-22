/**
 * Test Error composable for simulating API errors during development.
 *
 * Usage from browser console:
 *   window.__setTestError('500')    // Simulate 500 errors
 *   window.__setTestError('400')    // Simulate 400 errors
 *   window.__setTestError('timeout') // Simulate timeout (10s delay)
 *   window.__setTestError(null)     // Disable test errors
 *   window.__getTestError()         // Get current test error setting
 *
 * The setting persists in localStorage across page reloads.
 */

const TEST_ERROR_KEY = 'dev_test_error'

export function useTestError() {
  // Get current test error setting
  const getTestError = (): string | null => {
    if (import.meta.server) return null
    return localStorage.getItem(TEST_ERROR_KEY)
  }

  // Set test error (null to disable)
  const setTestError = (errorType: string | null): void => {
    if (import.meta.server) return
    if (errorType) {
      localStorage.setItem(TEST_ERROR_KEY, errorType)
      console.log(`[TEST ERROR] Enabled: ${errorType} - API calls will fail with this error`)
    } else {
      localStorage.removeItem(TEST_ERROR_KEY)
      console.log('[TEST ERROR] Disabled - API calls will work normally')
    }
  }

  // Append test error query param to URL if enabled
  const appendTestError = (url: string): string => {
    const testError = getTestError()
    if (!testError) return url

    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}testError=${testError}`
  }

  // Create a wrapped $fetch that adds test error param
  const fetchWithTestError = async <T>(
    url: string,
    options?: Parameters<typeof $fetch>[1]
  ): Promise<T> => {
    const modifiedUrl = appendTestError(url)
    return $fetch<T>(modifiedUrl, options)
  }

  return {
    getTestError,
    setTestError,
    appendTestError,
    fetchWithTestError,
  }
}

// Global helpers for browser console (only in client)
if (import.meta.client) {
  ;(window as any).__setTestError = (errorType: string | null) => {
    const { setTestError } = useTestError()
    setTestError(errorType)
  }
  ;(window as any).__getTestError = () => {
    const { getTestError } = useTestError()
    const current = getTestError()
    console.log(`[TEST ERROR] Current setting: ${current || 'disabled'}`)
    return current
  }
}
