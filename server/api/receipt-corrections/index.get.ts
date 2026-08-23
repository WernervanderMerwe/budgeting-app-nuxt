import { getPrisma } from '~~/server/utils/db'
import { errors } from '~~/server/utils/errors'

// GET /api/receipt-corrections - the unresolved OCR/regex-gap review queue,
// sorted by how often the same garble has recurred (worth fixing first).
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)

    const rows = await prisma.receiptTextCorrection.findMany({
      where: { profileToken, resolvedAt: null },
      orderBy: { timesSeen: 'desc' },
    })

    const corrections = rows.map((row) => ({
      id: row.id,
      rawText: row.rawText,
      correctedTo: row.correctedTo,
      timesSeen: row.timesSeen,
      lastSeenAt: row.lastSeenAt,
    }))

    return { corrections }
  } catch (error) {
    return errors.serverError(event, 'Failed to fetch receipt corrections', error as Error)
  }
})
