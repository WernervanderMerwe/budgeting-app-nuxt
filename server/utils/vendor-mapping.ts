import type { PrismaClient, ExpenseCategory, VendorMapping } from '@prisma/client'
import { canonicaliseVendor, normaliseVendorKey } from '~~/shared/utils/receipt-merchants'
import { getCurrentTimestamp } from '~~/server/utils/date'
import type { VendorMapping as VendorMappingDto } from '~~/app/types/vendor-mappings'

/**
 * Vendor -> expense category learning.
 *
 * See docs/plans/2026-08-22-vendor-expense-category-design.md. Two tables
 * back this: `VendorMapping` (vendor -> tag, with a count) and
 * `ReceiptTextCorrection` (a review queue of raw OCR text the brand regexes
 * failed to recognise).
 *
 * Every vendor string entering either function is first run through
 * `canonicaliseVendor`, which matches it against the same `BRANDS` table the
 * receipt parser uses and collapses it to the bare brand name. "Shell
 * Vredekloof", "shell garage" and "SHELL" therefore all resolve to the single
 * "Shell" row rather than fragmenting into three, and the user never has to
 * curate near-duplicates. Only strings that match NO brand are stored as
 * typed — and those are exactly the ones queued into
 * `ReceiptTextCorrection`, so the brand table can be extended later.
 *
 * Matching is then exact equality against `vendor_key` — uppercased,
 * whitespace-collapsed, trailing punctuation stripped. That key is
 * `normaliseVendorKey(<canonical brand>)` when a brand matched, and
 * `normaliseVendorKey(<untouched OCR merchant text>)` when none did, so an
 * unrecognised vendor is keyed on what the scanner will see again next time
 * rather than on however the user chose to write it. `vendor` is a
 * display-only column: it is set
 * once when a mapping is first created and never overwritten, so shipped
 * defaults stay in readable Title Case ("Shell", "Mr Price") and brand names
 * that don't title-case cleanly (e.g. "Pick n Pay", "Dis-Chem") render
 * correctly on the Settings screen.
 */

/**
 * The lookup key for a vendor string: its canonical brand name when the brand
 * table recognises it, otherwise the string as typed.
 *
 * This is the READ side of the key. `learnVendorMapping` deliberately does not
 * call this function — it has `rawMerchant` available and must key on that,
 * not on the user's freeform edit, to land on the same key this produces (see
 * the symmetry note there). The two derivations are equivalent by design and
 * must be changed together: a learn that keys differently from a resolve
 * writes rows nothing ever reads back, which is silent and untested-for.
 */
function vendorLookupKey(vendor: string): string {
  return normaliseVendorKey(canonicaliseVendor(vendor) ?? vendor)
}

/**
 * The single definition of what the client sees for a VendorMapping row.
 * Both /api/vendor-mappings (GET) and /api/vendor-mappings/[id] (PATCH) must
 * go through this — it strips profileToken/vendorKey/createdAt/updatedAt and
 * derives isDefault, so neither endpoint can drift from the other or leak a
 * raw Prisma row to the client.
 */
export function toVendorMappingDto(row: VendorMapping): VendorMappingDto {
  return {
    id: row.id,
    vendor: row.vendor,
    expenseCategory: row.expenseCategory,
    timesSeen: row.timesSeen,
    lastSeenAt: row.lastSeenAt,
    isDefault: row.profileToken === null,
  }
}

export interface VendorTagsResult {
  /** The top-ranked tag for this vendor, or null if nothing is known. */
  expenseCategory: ExpenseCategory | null
  /** All tags known for this vendor, ranked timesSeen desc then lastSeenAt desc. */
  vendorTags: ExpenseCategory[]
}

/**
 * Resolve the expense-category tag(s) for a vendor.
 *
 * Precedence: the user's own `VendorMapping` rows for this vendor always rank
 * ahead of the shipped `profile_token IS NULL` defaults, but the defaults are
 * never discarded wholesale just because the user has *some* history. One
 * off-pattern booking (a sandwich at Shell filed under Takeaways, seen once)
 * used to permanently suppress the shipped `Shell -> TRANSPORT` default with
 * no way for the user to see why. Now both surface: user rows first (ranked
 * `timesSeen` desc, then `lastSeenAt` desc), defaults appended below all user
 * rows in the same rank order, de-duplicated by `expenseCategory` — if a user
 * row and a default carry the same category, only the user row is kept.
 */
export async function resolveVendorTags(
  prisma: PrismaClient,
  profileToken: string,
  vendor: string | null,
): Promise<VendorTagsResult> {
  if (!vendor) {
    return { expenseCategory: null, vendorTags: [] }
  }

  const key = vendorLookupKey(vendor)
  const orderBy = [{ timesSeen: 'desc' as const }, { lastSeenAt: 'desc' as const }]

  const [userRows, defaultRows] = await Promise.all([
    prisma.vendorMapping.findMany({
      where: { profileToken, vendorKey: key },
      orderBy,
    }),
    prisma.vendorMapping.findMany({
      where: { profileToken: null, vendorKey: key },
      orderBy,
    }),
  ])

  // User rows rank first, defaults below, de-duplicated by expenseCategory so
  // a default already covered by a user row does not appear twice.
  const seen = new Set<ExpenseCategory>()
  const vendorTags: ExpenseCategory[] = []
  for (const row of [...userRows, ...defaultRows]) {
    if (seen.has(row.expenseCategory)) continue
    seen.add(row.expenseCategory)
    vendorTags.push(row.expenseCategory)
  }

  return { expenseCategory: vendorTags[0] ?? null, vendorTags }
}

export interface LearnVendorMappingInput {
  vendor: string
  /**
   * Null when the chosen budget category has no expense-category tag. The
   * VendorMapping upsert is skipped in that case (there is no budgeting
   * decision to record), but the correction-queue logic below still runs —
   * see the null-handling note in learnVendorMapping.
   */
  expenseCategory: ExpenseCategory | null
  /**
   * The untouched OCR merchant text, when the save came from a scan. Only
   * used for the review queue, and only when the vendor matches no brand.
   */
  rawMerchant?: string | null
}

/**
 * Record that this user booked `vendor` to `expenseCategory` on a saved
 * receipt-derived transaction. Upserts on [profileToken, vendorKey,
 * expenseCategory], so "Shell", "shell", "Shell " and "Shell Vredekloof" all
 * resolve to the same key and accumulate on one row rather than fragmenting.
 *
 * `expenseCategory` may be null when the chosen budget category carries no
 * tag. That skips the VendorMapping upsert entirely — there is no budgeting
 * decision to record — but this function still falls through to the
 * correction-queue logic below. `/api/receipts/learn` is the ONLY writer of
 * `ReceiptTextCorrection`, so gating that queue on `expenseCategory` would
 * mean an untagged user's regex-gap queue never fills at all.
 *
 * Also queues a `ReceiptTextCorrection` row whenever `canonicaliseVendor`
 * recognises NO brand in the string. The trigger is deliberately the brand
 * table's verdict on the saved text, not the parser's own outcome on the
 * image: the string being learned is whatever the user finally saved, which
 * they may have typed or corrected by hand. An unrecognised vendor is a gap
 * in the brand table regardless of how the scan went, and the queue is where
 * those gaps are reviewed and turned into new patterns.
 *
 * The mapping row is still written for unrecognised vendors: it makes the
 * next identical slip preselect correctly, while the queue entry keeps the
 * gap visible without the user having to curate anything.
 */
export async function learnVendorMapping(
  prisma: PrismaClient,
  profileToken: string,
  input: LearnVendorMappingInput,
): Promise<void> {
  const now = getCurrentTimestamp()
  // Null means the brand table does not know this vendor — which both decides
  // the display label below and triggers the review-queue entry at the end.
  //
  // Symmetry requirement: server/api/receipts/scan.post.ts resolves tags with
  // `resolveVendorTags(prisma, profileToken, parsed.brand ?? parsed.merchant)`.
  // We trust the text the user actually saved (`input.vendor`) over the
  // parser's brand guess, so: canonicalise `input.vendor` itself. When that
  // succeeds, key on the canonical brand — this is exactly what scan's
  // `parsed.brand` would also canonicalise to. When it doesn't, key on the
  // untouched OCR merchant text (`input.rawMerchant`) when we have it, which
  // mirrors scan's `parsed.brand ?? parsed.merchant` fallback — NOT on the
  // user's freeform edit, which scan.post.ts never sees. A future change to
  // either this key derivation or the scan.post.ts lookup that breaks this
  // symmetry means rows get written here that are never read back there.
  const canonical = canonicaliseVendor(input.vendor)
  const display = canonical ?? input.vendor.trim()
  const vendorKey = canonical
    ? normaliseVendorKey(canonical)
    : normaliseVendorKey(input.rawMerchant ?? input.vendor)

  if (input.expenseCategory) {
    // Upsert, not findFirst-then-create/update: two concurrent saves for the
    // same vendor+category (e.g. two receipts from the same shop scanned back
    // to back) would otherwise both see no existing row, both try to create,
    // and the loser's create fails on the unique constraint below — silently,
    // since this endpoint is fire-and-forget (see the doc comment above).
    await prisma.vendorMapping.upsert({
      where: {
        profileToken_vendorKey_expenseCategory: {
          profileToken,
          vendorKey,
          expenseCategory: input.expenseCategory,
        },
      },
      update: {
        // `vendor` is not touched here: the first spelling seen wins as the
        // display label.
        timesSeen: { increment: 1 },
        lastSeenAt: now,
        updatedAt: now,
      },
      create: {
        profileToken,
        vendor: display,
        vendorKey,
        expenseCategory: input.expenseCategory,
        timesSeen: 1,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      },
    })
  }
  // else: no expense category was chosen for this booking. There is no
  // budgeting decision to record, so the VendorMapping upsert above is
  // skipped entirely — but we still fall through to the correction-queue
  // logic below (see the doc comment on this function).

  if (canonical) {
    // A known brand. Nothing to review — the table already covers it.
    return
  }

  // Prefer the untouched OCR string when we have it: that is the text a new
  // pattern would have to match. Fall back to what the user saved, which for a
  // hand-typed vendor is the only text there is.
  const rawKey = normaliseVendorKey(input.rawMerchant ?? input.vendor)

  // Skip when the raw text and the display text normalise to the same thing:
  // this is a legitimate un-branded vendor typed/kept by hand (e.g. "Joe
  // Bloggs Butchery" -> "Joe Bloggs Butchery"), not evidence of an OCR/regex
  // gap. The queue exists to surface cases where the raw OCR text differs
  // from what it should have read; text that round-trips unchanged is not
  // evidence of one, and writing it anyway would present the UI with a
  // "recurring garble" that isn't one.
  if (rawKey === normaliseVendorKey(display)) {
    return
  }

  // Upsert for the same reason as the VendorMapping write above: avoids a
  // find-then-create/update race between two concurrent saves.
  await prisma.receiptTextCorrection.upsert({
    where: { profileToken_rawText: { profileToken, rawText: rawKey } },
    update: {
      correctedTo: display,
      timesSeen: { increment: 1 },
      lastSeenAt: now,
      updatedAt: now,
    },
    create: {
      profileToken,
      rawText: rawKey,
      correctedTo: display,
      timesSeen: 1,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    },
  })
}
