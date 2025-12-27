import type { H3Event } from 'h3'
import { setResponseStatus } from 'h3'
import type { ZodError } from 'zod'

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

  validationError: (event: H3Event, zodError: ZodError) => {
    const fields = zodError.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }))
    setResponseStatus(event, 422)
    return {
      error: true,
      statusCode: 422,
      message: 'Validation failed',
      fields,
    }
  },

  serverError: (event: H3Event, message: string, error?: Error) => {
    if (error) {
      console.error(message, error)
    }
    return errorResponse(event, 500, message, error?.message)
  },
}
