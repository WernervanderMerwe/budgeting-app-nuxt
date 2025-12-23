import { getPrisma } from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'
import { getCurrentTimestamp } from '~/server/utils/date'
import { errors } from '~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    // Verify ownership through parent month
    const existing = await prisma.transactionFixedPayment.findFirst({
      where: {
        id,
        month: { profileToken },
      },
    })

    if (!existing) {
      return errors.notFound(event, 'Fixed payment not found')
    }

    const updateData: any = {
      updatedAt: getCurrentTimestamp(),
    }
    if (body.name !== undefined) updateData.name = body.name
    if (body.amount !== undefined) updateData.amount = randsToCents(body.amount)
    if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex

    const fixedPayment = await prisma.transactionFixedPayment.update({
      where: { id },
      data: updateData,
    })

    // Return as-is (values in cents) to match GET endpoint
    return fixedPayment
  } catch (error) {
    return errors.serverError(event, 'Failed to update fixed payment', error as Error)
  }
})
