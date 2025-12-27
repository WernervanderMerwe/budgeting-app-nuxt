# API Design Review - TODO

Based on the `api-design-principles` skill guidelines. Review and apply as needed.

## What You're Doing Well

- **RESTful URL structure** - Nuxt 3 file-based routing gives you clean REST patterns
  - `GET /api/months` - list
  - `POST /api/months` - create
  - `GET /api/months/[id]` - read
  - `PATCH /api/months/[id]` - update
  - `DELETE /api/months/[id]` - delete
- **Consistent error utility** - `errors.badRequest()`, `errors.notFound()`, etc.
- **Input validation** - Zod schemas for request body validation
- **Ownership verification** - Checking `profileToken` on all resources
- **Proper HTTP methods** - Using PATCH for partial updates (not PUT)

---

## Priority: Medium - Status Codes (COMPLETED)

### POST should return 201 Created
All POST endpoints now use `setResponseStatus(event, 201)` before returning.

### Validation errors should return 422
Added `errors.validationError(event, zodError)` to `server/utils/errors.ts`.
Returns field-level validation errors:
```json
{
  "error": true,
  "statusCode": 422,
  "message": "Validation failed",
  "fields": [{ "field": "name", "message": "Required" }]
}
```

---

## Priority: Medium - Error Response Structure

Current format is minimal:
```json
{
  "error": true,
  "statusCode": 404,
  "message": "Category not found"
}
```

Recommended format (more debuggable):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Category not found",
    "details": { "categoryId": 123 },
    "timestamp": 1703625600,
    "path": "/api/categories/123"
  }
}
```

### Update errors.ts
```typescript
export function errorResponse(
  event: H3Event,
  statusCode: number,
  code: string,  // Add error code
  message: string,
  details?: Record<string, any>
) {
  setResponseStatus(event, statusCode)
  return {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      timestamp: Math.floor(Date.now() / 1000),
      path: getRequestURL(event).pathname,
    },
  }
}
```

---

## Priority: Low - Pagination

List endpoints return all records without pagination:

```typescript
// Current - returns all months
const months = await prisma.transactionMonth.findMany({
  where: { profileToken },
  orderBy: [{ year: 'desc' }, { month: 'desc' }],
})
return months

// Recommended - add pagination
const page = parseInt(getQuery(event).page as string) || 1
const pageSize = Math.min(parseInt(getQuery(event).pageSize as string) || 20, 100)
const skip = (page - 1) * pageSize

const [months, total] = await Promise.all([
  prisma.transactionMonth.findMany({
    where: { profileToken },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    skip,
    take: pageSize,
  }),
  prisma.transactionMonth.count({ where: { profileToken } }),
])

return {
  items: months,
  page,
  pageSize,
  total,
  pages: Math.ceil(total / pageSize),
}
```

**Trade-off:** For a personal budgeting app, you'll likely have <100 months ever. Pagination may be overkill. Consider only if performance becomes an issue.

---

## Priority: Low - API Versioning

No versioning currently. Options:

1. **URL versioning** (recommended for simplicity)
   ```
   /api/v1/months
   /api/v1/yearly
   ```

2. **Do nothing** - This is a personal app, not a public API. Breaking changes are acceptable.

**Recommendation:** Skip versioning for now. Add only if you ever expose this API publicly.

---

## Priority: Low - Action Endpoints

You have action-oriented endpoints:
- `POST /api/yearly/[id]/copy-month`
- `POST /api/yearly/[id]/clear-month`

This breaks REST purism but is **pragmatic for complex operations**. The skill notes this as a common pitfall, but for internal APIs, it's often the right choice.

**Keep as-is** - These are clear and intuitive.

---

## Priority: Low - Documentation

No OpenAPI/Swagger docs. Options:

1. Add `nuxt-swagger` or similar for auto-generated docs
2. Manual OpenAPI spec in `docs/api.yaml`
3. Skip - personal app doesn't need it

**Recommendation:** Skip unless you plan to share this API.

---

## Not Needed for This Project

These recommendations from the skill don't apply:

- **Rate limiting** - Personal app, single user
- **CORS** - Same-origin requests only
- **HATEOAS** - Overkill for this use case
- **GraphQL migration** - REST is fine for CRUD apps

---

## Quick Wins Checklist

- [x] Add `setResponseStatus(event, 201)` to POST endpoints
- [x] Add `validationError` (422) to errors utility
- [ ] Consider adding error codes to error responses
- [ ] Optional: Add pagination to list endpoints if performance becomes an issue

---

## Files to Update

If applying status code changes:
```
server/api/months/index.post.ts
server/api/transactions/index.post.ts
server/api/categories/index.post.ts
server/api/fixed-payments/index.post.ts
server/api/yearly/index.post.ts
server/api/yearly/income-sources/index.post.ts
server/api/yearly/categories/index.post.ts
server/api/yearly/deductions/index.post.ts
server/utils/errors.ts
```
