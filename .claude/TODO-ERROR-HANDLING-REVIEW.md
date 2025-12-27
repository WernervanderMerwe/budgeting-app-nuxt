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

## Priority: Medium - Zod Validation Error Details (COMPLETED)

Added `errors.validationError(event, zodError)` to `server/utils/errors.ts`.
Returns 422 with field-level errors:
```json
{
  "error": true,
  "statusCode": 422,
  "message": "Validation failed",
  "fields": [{ "field": "income", "message": "Expected number, received string" }]
}
```

---

## Priority: Medium - Inconsistent ZodError Handling (COMPLETED)

All POST endpoints now have consistent ZodError handling using `errors.validationError()`.

---

## Priority: Low - Frontend Error Message Extraction (COMPLETED)

Created `utils/api-error.ts` with `extractErrorMessage(error, fallback)`.
Updated `useYearlyBudget.ts` to use it with proper `catch (e: unknown)` typing.

All composables updated:
- `useBudget.ts` ✓
- `useMonths.ts` ✓
- `useYearlyCategories.ts` ✓
- `useYearlyIncome.ts` ✓
- `useYearlySummary.ts` ✓

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

- [x] Add `validationError` helper to `errors.ts` with field details
- [x] Add `z.ZodError` check to all POST endpoints that use Zod
- [x] Create `extractErrorMessage` utility for frontend
- [x] Update `useYearlyBudget.ts` with proper error typing
- [x] Apply same pattern to all other composables

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
