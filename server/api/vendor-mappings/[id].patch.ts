import { z } from 'zod'
import { getPrisma } from '~~/server/utils/db'
import { getCurrentTimestamp } from '~~/server/utils/date'
import { errors } from '~~/server/utils/errors'
import { vendorMappingPatchSchema } from '~~/server/utils/validation'
import { toVendorMappingDto } from '~~/server/utils/vendor-mapping'

// PATCH /api/vendor-mappings/[id] - re-tag one learned vendor mapping.
// Shipped defaults (profile_token IS NULL) are read-only.
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      return errors.badRequest(event, 'Invalid vendor mapping ID')
    }

    const body = await readBody(event)
    const validated = vendorMappingPatchSchema.parse(body)

    const existing = await prisma.vendorMapping.findUnique({ where: { id } })

    if (!existing || (existing.profileToken !== null && existing.profileToken !== profileToken)) {
      return errors.notFound(event, 'Vendor mapping not found')
    }

    if (existing.profileToken === null) {
      return errors.forbidden(event, 'Shipped default vendor mappings cannot be edited')
    }

    const updated = await prisma.vendorMapping.update({
      where: { id },
      data: {
        expenseCategory: validated.expenseCategory,
        updatedAt: getCurrentTimestamp(),
      },
    })

    return toVendorMappingDto(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors.validationError(event, error)
    }
    // Retagging to a category this vendor already carries hits the
    // [profileToken, vendorKey, expenseCategory] unique constraint — that is a
    // real conflict for the user to resolve (the pair already exists), not a
    // server fault.
    if ((error as { code?: string })?.code === 'P2002') {
      return errors.conflict(event, 'This vendor is already tagged with that expense category')
    }
    return errors.serverError(event, 'Failed to update vendor mapping', error as Error)
  }
})
