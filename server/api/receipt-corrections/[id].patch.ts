import { z } from 'zod'
import { getPrisma } from '~~/server/utils/db'
import { getCurrentTimestamp } from '~~/server/utils/date'
import { errors } from '~~/server/utils/errors'
import { receiptCorrectionPatchSchema } from '~~/server/utils/validation'

// PATCH /api/receipt-corrections/[id] - mark a correction resolved (the
// underlying regex gap was fixed in shared/utils/receipt-merchants.ts).
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      return errors.badRequest(event, 'Invalid correction ID')
    }

    const body = await readBody(event)
    receiptCorrectionPatchSchema.parse(body)

    const existing = await prisma.receiptTextCorrection.findFirst({
      where: { id, profileToken },
    })

    if (!existing) {
      return errors.notFound(event, 'Receipt correction not found')
    }

    const now = getCurrentTimestamp()
    const updated = await prisma.receiptTextCorrection.update({
      where: { id },
      data: {
        resolvedAt: now,
        updatedAt: now,
      },
    })

    return updated
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors.validationError(event, error)
    }
    return errors.serverError(event, 'Failed to update receipt correction', error as Error)
  }
})
