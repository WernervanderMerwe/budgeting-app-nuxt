import { getPrisma } from '~~/server/utils/db'
import { errors } from '~~/server/utils/errors'
import { toVendorMappingDto } from '~~/server/utils/vendor-mapping'

// GET /api/vendor-mappings - this user's learned vendor mappings plus the
// shipped defaults (profile_token IS NULL), for the settings management screen.
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)

    const rows = await prisma.vendorMapping.findMany({
      where: {
        OR: [{ profileToken }, { profileToken: null }],
      },
      orderBy: [
        { vendor: 'asc' },
        { timesSeen: 'desc' },
      ],
    })

    const mappings = rows.map(toVendorMappingDto)

    return { mappings }
  } catch (error) {
    return errors.serverError(event, 'Failed to fetch vendor mappings', error as Error)
  }
})
