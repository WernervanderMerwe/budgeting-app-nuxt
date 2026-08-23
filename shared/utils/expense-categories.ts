/**
 * The expense-category taxonomy, shared by the Nitro server and the browser.
 *
 * This mirrors the `ExpenseCategory` enum in `prisma/schema.prisma`. It is
 * duplicated here deliberately: importing the Prisma client into a Vue
 * component would drag the whole query engine into the browser bundle, and
 * `shared/` may not depend on anything server-only.
 *
 * KEEP IN SYNC with the Prisma enum. `test/expense-categories.test.ts` guards
 * the pairing by reading the schema file.
 *
 * ## Where this list comes from
 *
 * The divisions of COICOP 2018 — the UN Classification of Individual
 * Consumption According to Purpose ([UNSD][coicop]), which Stats SA also uses
 * as the division structure of the CPI basket ([P0141][statssa]). Divisions
 * 02 (alcohol & tobacco), 10 (education) and 12 (insurance & financial
 * services) are folded into `OTHER`: nothing in this app's slip flow files to
 * them often enough to earn a dropdown row.
 *
 * COICOP classifies by *purpose* — what the money was for — not by retailer
 * type and not by the user's own spending habits. That distinction is the
 * whole point of the list, and two rules follow from it:
 *
 * - **No retailer-shaped values.** "General retail" is a kind of shop, not a
 *   purpose. Makro books to `HOUSEHOLD_AND_MAINTENANCE`, Mr Price to
 *   `CLOTHING_AND_FOOTWEAR`, by what is actually being bought.
 * - **No habit-shaped values.** "Bicycle" is one person's hobby, not a
 *   division of consumption; it is `RECREATION_AND_SPORT` (COICOP 09). Fuel
 *   is not a peer of transport, it is *part* of it (COICOP 07.2.2), so it
 *   books to `TRANSPORT`.
 *
 * Granularity below the division belongs in the user's own category names,
 * which are free text: a category called "Petrol" or "Bike stuff" tags to
 * `TRANSPORT` and `RECREATION_AND_SPORT` respectively. Resist adding a value
 * here to describe one household's spending — that is what the name is for.
 *
 * Deliberately **not** the card-network Merchant Category Code (ISO 18245),
 * which is a four-digit code we cannot recover from a paper slip. See
 * `docs/plans/2026-08-22-vendor-expense-category-design.md`.
 *
 * [coicop]: https://unstats.un.org/unsd/classifications/Econ/coicop
 * [statssa]: https://www.statssa.gov.za/?page_id=1854&PPN=P0141
 */

/** In COICOP division order, which is also the order the dropdown renders. */
export const EXPENSE_CATEGORIES = [
  'FOOD_AND_GROCERIES', // COICOP 01 — food and non-alcoholic beverages
  'CLOTHING_AND_FOOTWEAR', // COICOP 03
  'HOUSING_AND_UTILITIES', // COICOP 04 — rent, water, electricity, gas
  'HOUSEHOLD_AND_MAINTENANCE', // COICOP 05 — furnishings, appliances, upkeep
  'HEALTH', // COICOP 06
  'TRANSPORT', // COICOP 07 — incl. fuel (07.2.2), servicing, fares, parking
  'COMMUNICATION', // COICOP 08 — connectivity, airtime, ICT equipment
  'RECREATION_AND_SPORT', // COICOP 09 — incl. bicycles, hobbies, streaming
  'RESTAURANTS_AND_TAKEAWAYS', // COICOP 11 — incl. accommodation
  'PERSONAL_CARE', // COICOP 13.1
  'OTHER', // COICOP 13 remainder, plus folded-in 02 / 10 / 12
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

/** Display labels. The enum value is storage; this is what a human reads. */
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  FOOD_AND_GROCERIES: 'Food & Groceries',
  CLOTHING_AND_FOOTWEAR: 'Clothing & Footwear',
  HOUSING_AND_UTILITIES: 'Housing & Utilities',
  HOUSEHOLD_AND_MAINTENANCE: 'Household & Maintenance',
  HEALTH: 'Health',
  TRANSPORT: 'Transport',
  COMMUNICATION: 'Communication',
  RECREATION_AND_SPORT: 'Recreation & Sport',
  RESTAURANTS_AND_TAKEAWAYS: 'Restaurants & Takeaways',
  PERSONAL_CARE: 'Personal Care',
  OTHER: 'Other',
}

/**
 * One-line hints for the dropdown, so the boundary between neighbouring
 * divisions is visible at the point of choosing rather than guessed at.
 */
export const EXPENSE_CATEGORY_HINTS: Record<ExpenseCategory, string> = {
  FOOD_AND_GROCERIES: 'Supermarket shopping, food and drink brought home',
  CLOTHING_AND_FOOTWEAR: 'Clothes, shoes, repairs and alterations',
  HOUSING_AND_UTILITIES: 'Rent, bond, rates, water, electricity, gas',
  HOUSEHOLD_AND_MAINTENANCE: 'Furniture, appliances, tools, cleaning, repairs',
  HEALTH: 'Doctors, dentists, medicines, medical aid',
  TRANSPORT: 'Fuel, servicing, licensing, taxis, buses, parking, tolls',
  COMMUNICATION: 'Airtime, data, fibre, phones and computers',
  RECREATION_AND_SPORT: 'Sport, hobbies, cycling, streaming, outings',
  RESTAURANTS_AND_TAKEAWAYS: 'Eating out, takeaways, coffee shops, hotels',
  PERSONAL_CARE: 'Toiletries, cosmetics, hairdressing',
  OTHER: 'Anything that fits nowhere else',
}

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === 'string'
    && (EXPENSE_CATEGORIES as readonly string[]).includes(value)
}

/** Label for display, falling back to the raw value if the enum ever drifts. */
export function expenseCategoryLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return isExpenseCategory(value) ? EXPENSE_CATEGORY_LABELS[value] : value
}
