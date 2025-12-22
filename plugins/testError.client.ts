/**
 * Test Error Plugin - Intercepts $fetch calls and adds testError query param
 *
 * This plugin only runs in development and on the client side.
 * It reads from localStorage to determine if test errors are enabled.
 *
 * Usage from browser console:
 *   window.__setTestError('500')    // Simulate 500 errors
 *   window.__setTestError('400')    // Simulate 400 errors
 *   window.__setTestError('timeout') // Simulate timeout (10s delay)
 *   window.__setTestError(null)     // Disable test errors
 *   window.__getTestError()         // Get current test error setting
 */

const TEST_ERROR_KEY = 'dev_test_error'

export default defineNuxtPlugin(() => {
  // Only modify in development
  if (import.meta.env.PROD) return

  // Store original $fetch
  const originalFetch = globalThis.$fetch

  // Create intercepted $fetch
  const interceptedFetch = ((url: string, options?: any) => {
    const testError = localStorage.getItem(TEST_ERROR_KEY)

    if (testError && typeof url === 'string' && url.startsWith('/api/')) {
      const separator = url.includes('?') ? '&' : '?'
      const modifiedUrl = `${url}${separator}testError=${testError}`
      console.log(`[TEST ERROR] Intercepted: ${url} -> ${modifiedUrl}`)
      return originalFetch(modifiedUrl, options)
    }

    return originalFetch(url, options)
  }) as typeof $fetch

  // Copy over all properties from original $fetch (like .raw, .create, etc.)
  Object.assign(interceptedFetch, originalFetch)

  // Replace global $fetch
  globalThis.$fetch = interceptedFetch

  // Set up console helpers
  ;(window as any).__setTestError = (errorType: string | null) => {
    if (errorType) {
      localStorage.setItem(TEST_ERROR_KEY, errorType)
      console.log(`%c[TEST ERROR] Enabled: ${errorType}`, 'color: orange; font-weight: bold')
      console.log('API calls to /api/* will now fail with this error type')
      console.log('Available types: 400, 403, 404, 500, timeout')
    } else {
      localStorage.removeItem(TEST_ERROR_KEY)
      console.log('%c[TEST ERROR] Disabled', 'color: green; font-weight: bold')
      console.log('API calls will work normally')
    }
  }

  ;(window as any).__getTestError = () => {
    const current = localStorage.getItem(TEST_ERROR_KEY)
    console.log(`%c[TEST ERROR] Current: ${current || 'disabled'}`, 'color: cyan')
    return current
  }

  // Log initial state if test error is enabled
  const initialTestError = localStorage.getItem(TEST_ERROR_KEY)
  if (initialTestError) {
    console.log(`%c[TEST ERROR] Active: ${initialTestError}`, 'color: orange; font-weight: bold')
  }
})
