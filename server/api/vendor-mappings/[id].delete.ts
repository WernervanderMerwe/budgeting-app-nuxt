import { getPrisma } from '~~/server/utils/db'
import { errors } from '~~/server/utils/errors'

// DELETE /api/vendor-mappings/[id] - remove one learned vendor mapping.
// Shipped defaults (profile_token IS NULL) are read-only.
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      return errors.badRequest(event, 'Invalid vendor mapping ID')
    }

    const existing = await prisma.vendorMapping.findUnique({ where: { id } })

    if (!existing || (existing.profileToken !== null && existing.profileToken !== profileToken)) {
      return errors.notFound(event, 'Vendor mapping not found')
    }

    if (existing.profileToken === null) {
      return errors.forbidden(event, 'Shipped default vendor mappings cannot be deleted')
    }

    await prisma.vendorMapping.delete({ where: { id } })

    return null
  } catch (error) {
    return errors.serverError(event, 'Failed to delete vendor mapping', error as Error)
  }
})
