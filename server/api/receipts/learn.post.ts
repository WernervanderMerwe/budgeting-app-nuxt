import { z } from 'zod'
import { getPrisma } from '~~/server/utils/db'
import { errors } from '~~/server/utils/errors'
import { learnVendorMappingSchema } from '~~/server/utils/validation'
import { learnVendorMapping } from '~~/server/utils/vendor-mapping'

// POST /api/receipts/learn - record that this user booked a vendor to an
// expense category, and (when applicable) queue an OCR/regex-gap correction.
// Called after a receipt-derived transaction is saved. Silent by design —
// see docs/plans/2026-08-22-vendor-expense-category-design.md.
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const body = await readBody(event)
    const validated = learnVendorMappingSchema.parse(body)

    await learnVendorMapping(prisma, profileToken, validated)

    return null
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors.validationError(event, error)
    }
    return errors.serverError(event, 'Failed to save vendor mapping', error as Error)
  }
})
