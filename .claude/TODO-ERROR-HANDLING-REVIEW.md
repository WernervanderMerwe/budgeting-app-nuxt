# Error Handling Review - TODO

Based on the `error-handling-patterns` skill guidelines. Review and apply as needed.

## What You're Doing Well

- **Centralized error utility** - `server/utils/errors.ts` provides consistent error responses
- **Try-catch in all API handlers** - Every endpoint wrapped in try-catch
- **Optimistic updates with rollback** - `useYearlyBudget.ts` stores previous state and reverts on error
- **Toast notifications** - `useOptimisticUpdates.ts` provides `showErrorToast()`
- **Loading state cleanup** - Using `finally` blocks to reset loading state
- **Zod validation** - Input validation with schemas

---

## Priority: Medium - Zod Validation Error Details

### Current: Generic error message
```typescript
// server/api/months/index.post.ts
if (error instanceof z.ZodError) {
  return errors.badRequest(event, 'Invalid input data')  // No field details!
}
```

### Recommended: Expose field-level errors
```typescript
// server/utils/errors.ts - add validation error helper
validationError: (event: H3Event, zodError: z.ZodError) => {
  const fieldErrors = zodError.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }))
  return errorResponse(event, 422, 'Validation failed', { fields: fieldErrors })
}

// Usage in API handler
if (error instanceof z.ZodError) {
  return errors.validationError(event, error)
}
```

**Response would be:**
```json
{
  "error": true,
  "statusCode": 422,
  "message": "Validation failed",
  "details": {
    "fields": [
      { "field": "income", "message": "Expected number, received string" }
    ]
  }
}
```

---

## Priority: Medium - Inconsistent ZodError Handling

Only `months/index.post.ts` checks for `z.ZodError`. Other endpoints let it fall through to generic 500 error.

### Files missing ZodError handling:
- `server/api/categories/index.post.ts`
- `server/api/transactions/index.post.ts`
- `server/api/fixed-payments/index.post.ts`

### Solution: Create a wrapper or add consistent handling
```typescript
// Option 1: Add to each endpoint (quick fix)
} catch (error) {
  if (error instanceof z.ZodError) {
    return errors.validationError(event, error)
  }
  return errors.serverError(event, 'Failed to create X', error as Error)
}

// Option 2: Create a utility wrapper (cleaner)
export async function handleApiRequest<T>(
  event: H3Event,
  handler: () => Promise<T>,
  errorMessage: string
): Promise<T | ErrorResponse> {
  try {
    return await handler()
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors.validationError(event, error)
    }
    return errors.serverError(event, errorMessage, error as Error)
  }
}
```

---

## Priority: Low - Frontend Error Message Extraction

### Current: May not extract API error message correctly
```typescript
// useYearlyBudget.ts
} catch (e: any) {
  error.value = e.message || 'Failed to fetch budgets'  // e.message may not be API response
}
```

### The issue:
`$fetch` throws an error object where the API response is in `e.data`, not `e.message`.

### Recommended: Extract error properly
```typescript
// utils/api-error.ts
export function extractErrorMessage(error: any, fallback: string): string {
  // $fetch puts response body in error.data
  if (error?.data?.message) return error.data.message
  if (error?.message) return error.message
  return fallback
}

// Usage
} catch (e: any) {
  const message = extractErrorMessage(e, 'Failed to fetch budgets')
  error.value = message
  showErrorToast(message)
}
```

---

## Priority: Low - Error Type Safety

### Current: `catch (error: any)` everywhere

### Recommended: Type-safe error handling
```typescript
// types/errors.ts
export interface ApiError {
  data?: {
    error: boolean
    statusCode: number
    message: string
    details?: unknown
  }
  statusCode?: number
  message?: string
}

export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'data' in error
}

// Usage
} catch (error) {
  if (isApiError(error)) {
    showErrorToast(error.data?.message || 'Request failed')
  } else {
    showErrorToast('An unexpected error occurred')
  }
}
```

---

## Priority: Low - Custom Error Classes (Optional)

The skill recommends custom error hierarchies. For your app size, this may be overkill.

### If you want to add them:
```typescript
// server/utils/errors.ts
export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string, id: string | number) {
    super(`${resource} not found`, 'NOT_FOUND', 404, { resource, id })
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, fields?: Array<{ field: string; message: string }>) {
    super(message, 'VALIDATION_ERROR', 422, { fields })
  }
}

// Usage
throw new NotFoundError('Category', categoryId)
```

**Trade-off:** More code, better debugging in production. Skip if current approach works.

---

## Not Needed for This Project

These patterns from the skill are overkill:

- **Circuit breaker** - Single user, no external services to protect
- **Retry with exponential backoff** - Could add for Supabase calls but not critical
- **Result type pattern** - Try-catch is fine for your use case
- **Error aggregation** - Simple validation, not multi-field batch validation

---

## Quick Wins Checklist

- [ ] Add `validationError` helper to `errors.ts` with field details
- [ ] Add `z.ZodError` check to all POST endpoints that use Zod
- [ ] Create `extractErrorMessage` utility for frontend
- [ ] Consider typing errors instead of `any`

---

## Files to Update

**Backend:**
```
server/utils/errors.ts                    # Add validationError helper
server/api/categories/index.post.ts       # Add ZodError handling
server/api/transactions/index.post.ts     # Add ZodError handling
server/api/fixed-payments/index.post.ts   # Add ZodError handling
```

**Frontend:**
```
utils/api-error.ts                        # New - error extraction utility
composables/useYearlyBudget.ts            # Use extractErrorMessage
composables/useBudget.ts                  # Use extractErrorMessage (if applicable)
composables/useMonths.ts                  # Use extractErrorMessage (if applicable)
```
