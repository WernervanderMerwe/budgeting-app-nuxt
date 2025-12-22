import type { H3Event } from 'h3'

/**
 * Test error utility for simulating API errors during development.
 *
 * Usage: Add ?testError=400|500|timeout to any API request
 *
 * Examples:
 * - /api/yearly/categories?testError=400  -> Returns 400 Bad Request
 * - /api/yearly/categories?testError=500  -> Returns 500 Internal Server Error
 * - /api/yearly/categories?testError=timeout -> Waits 10s then returns 408 Request Timeout
 *
 * Only active when NODE_ENV !== 'production'
 */
export async function simulateTestError(event: H3Event): Promise<void> {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') return

  const query = getQuery(event)
  const testError = query.testError as string

  if (!testError) return

  console.log(`[TEST ERROR] Simulating ${testError} error for ${event.path}`)

  switch (testError) {
    case '400':
      throw createError({
        statusCode: 400,
        message: '[TEST] Bad Request - Simulated validation error',
      })

    case '500':
      throw createError({
        statusCode: 500,
        message: '[TEST] Internal Server Error - Simulated server failure',
      })

    case 'timeout':
      // Simulate a slow request that eventually times out
      await new Promise(resolve => setTimeout(resolve, 10000))
      throw createError({
        statusCode: 408,
        message: '[TEST] Request Timeout - Simulated timeout after 10s',
      })

    case '404':
      throw createError({
        statusCode: 404,
        message: '[TEST] Not Found - Simulated missing resource',
      })

    case '403':
      throw createError({
        statusCode: 403,
        message: '[TEST] Forbidden - Simulated authorization failure',
      })

    default:
      // Try to parse as a number for custom status codes
      const statusCode = parseInt(testError, 10)
      if (!isNaN(statusCode) && statusCode >= 400 && statusCode < 600) {
        throw createError({
          statusCode,
          message: `[TEST] HTTP ${statusCode} - Simulated error`,
        })
      }
  }
}
