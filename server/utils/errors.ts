import type { H3Event } from 'h3'
import { setResponseStatus } from 'h3'

/**
 * Create an error response that works with Cloudflare Workers.
 * Unlike throw createError(), this doesn't crash Workers.
 */
export function errorResponse(
  event: H3Event,
  statusCode: number,
  message: string,
  details?: string
) {
  setResponseStatus(event, statusCode)
  return {
    error: true,
    statusCode,
    message,
    ...(details ? { details } : {}),
  }
}

/**
 * Common error responses
 */
export const errors = {
  badRequest: (event: H3Event, message: string) =>
    errorResponse(event, 400, message),

  unauthorized: (event: H3Event, message = 'You must be logged in') =>
    errorResponse(event, 401, message),

  notFound: (event: H3Event, message: string) =>
    errorResponse(event, 404, message),

  serverError: (event: H3Event, message: string, error?: Error) => {
    if (error) {
      console.error(message, error)
    }
    return errorResponse(event, 500, message, error?.message)
  },
}
