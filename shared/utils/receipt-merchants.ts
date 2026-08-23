/**
 * South African merchant brand table.
 *
 * This file answers exactly one question: "which brand is this?" It does NOT
 * answer what that brand should be booked to — that is a budgeting decision,
 * not a fact about the shop, and it lives in the `vendor_mappings` table so it
 * stays user-editable data instead of a shipped constant. See
 * docs/plans/2026-08-22-vendor-expense-category-design.md.
 *
 * This is the file that grows. When a slip comes back with the wrong (or no)
 * merchant, add a pattern here and capture a fixture — see docs/dev-workflow.md.
 *
 * Ordering matters: the first pattern to match wins, so put specific patterns
 * above general ones. Patterns are matched against the TOP THIRD of a receipt
 * first; only if that finds nothing does the parser widen to the whole document
 * (excluding priced line items). Short generic words are therefore riskier than
 * they look — see the DANGER note below.
 */

export interface Brand {
  pattern: RegExp
  name: string
  /**
   * Match only in the top third, never in the whole-document fallback.
   *
   * For aliases that are ordinary English words ("spur of the moment", "boxer
   * shorts", "in two clicks", "rain") or two/three-letter initialisms. Matching
   * six header rows is a very different proposition from matching every line of
   * an OCR'd invoice, and these would fire constantly on the latter.
   */
  headOnly?: boolean
}

/**
 * DANGER: never add a bare /TOTAL/ pattern for TotalEnergies fuel — the word
 * TOTAL appears on virtually every till slip and would match constantly.
 * Likewise avoid bare /OK/, /PUMA/, /APPLE/ and other common words.
 */
export const BRANDS: readonly Brand[] = [
  // ── Groceries ────────────────────────────────────────────────────────────
  { pattern: /\b(SUPER ?SPAR|KWIK ?SPAR|SAVEMOR|SPAR)\b/i, name: 'Spar' },
  // `6[O0]`: OCR reads the stylised Sixty60 logo's zero as a capital O.
  { pattern: /\bCHECKERS\b|S[I1]XTY ?6[O0]/i, name: 'Checkers' },
  { pattern: /\bSHOPRITE\b/i, name: 'Shoprite' },
  { pattern: /\bUSAVE\b|\bU-SAVE\b/i, name: 'Usave' },
  { pattern: /PICK ?N ?PAY/i, name: 'Pick n Pay' },
  { pattern: /\bPNP\b/i, name: 'Pick n Pay', headOnly: true },
  { pattern: /\bBOXER\b/i, name: 'Boxer', headOnly: true }, // "boxer shorts"
  { pattern: /FOOD ?LOVER|FRUIT ?& ?VEG CITY/i, name: "Food Lover's Market" },
  { pattern: /WOOLWORTHS|\bWOOLIES\b/i, name: 'Woolworths' },
  { pattern: /OK ?(FOODS|GROCER|MINIMARK|URBAN)/i, name: 'OK Foods' },
  { pattern: /CAMBRIDGE ?FOOD/i, name: 'Cambridge Food' },
  { pattern: /\bFRESH ?STOP\b/i, name: 'FreshStop' },
  { pattern: /\bWOOLWORTHS ?FOOD\b/i, name: 'Woolworths' },

  // ── Fuel ─────────────────────────────────────────────────────────────────
  { pattern: /\bSHELL\b/i, name: 'Shell' },
  { pattern: /\bENGEN\b/i, name: 'Engen' },
  { pattern: /\bSASOL\b/i, name: 'Sasol' },
  { pattern: /\bCALTEX\b/i, name: 'Caltex' },
  { pattern: /\bASTRON\b/i, name: 'Astron Energy' },
  { pattern: /PUMA ?ENERGY/i, name: 'Puma Energy' },
  { pattern: /TOTAL ?ENERGIES/i, name: 'TotalEnergies' }, // never bare /TOTAL/
  { pattern: /\bBP\b/i, name: 'BP', headOnly: true },

  // ── Eating out ───────────────────────────────────────────────────────────
  { pattern: /NANDO'?S/i, name: "Nando's" },
  { pattern: /\bSTEERS\b/i, name: 'Steers' },
  { pattern: /\bWIMPY\b/i, name: 'Wimpy' },
  { pattern: /\bKFC\b/i, name: 'KFC' },
  { pattern: /MC ?DONALD/i, name: "McDonald's" },
  { pattern: /BURGER ?KING/i, name: 'Burger King' },
  { pattern: /DEBONAIRS/i, name: 'Debonairs' },
  { pattern: /ROMAN'?S ?PIZZA/i, name: "Roman's Pizza" },
  { pattern: /PIZZA ?HUT/i, name: 'Pizza Hut' },
  { pattern: /DOMINO'?S/i, name: "Domino's" },
  { pattern: /CHICKEN ?LICKEN/i, name: 'Chicken Licken' },
  { pattern: /FISHAWAYS/i, name: 'Fishaways' },
  { pattern: /ROCO ?MAMAS/i, name: 'RocoMamas' },
  { pattern: /\bSPUR\b/i, name: 'Spur', headOnly: true }, // "spur of the moment"
  { pattern: /OCEAN ?BASKET/i, name: 'Ocean Basket' },
  { pattern: /PANAROTTI/i, name: 'Panarottis' },
  { pattern: /JOHN ?DORY/i, name: "John Dory's" },
  { pattern: /COL'?CACCHIO/i, name: "Col'Cacchio" },
  { pattern: /SIMPLY ?ASIA/i, name: 'Simply Asia' },
  { pattern: /\bKAUAI\b/i, name: 'Kauai', headOnly: true },
  { pattern: /MUGG ?& ?BEAN|MUGG ?AND ?BEAN/i, name: 'Mugg & Bean' },
  { pattern: /VIDA ?E? ?CAFF?E/i, name: 'Vida e Caffè' },
  { pattern: /SEATTLE ?COFFEE/i, name: 'Seattle Coffee' },
  { pattern: /BOOTLEGGER/i, name: 'Bootlegger' },
  { pattern: /THE ?BARN\b/i, name: 'The Barn' }, // Montagu Village farm stall/café
  { pattern: /STARBUCKS/i, name: 'Starbucks' },
  { pattern: /KRISPY ?KREME/i, name: 'Krispy Kreme' },
  { pattern: /UBER ?EATS/i, name: 'Uber Eats' },
  { pattern: /MR ?D ?FOOD|MR ?DELIVERY|\bMRDFOOD\b/i, name: 'Mr D' },
  { pattern: /BOLT ?FOOD/i, name: 'Bolt Food' },

  // ── Entertainment ────────────────────────────────────────────────────────
  { pattern: /STER[- ]?KINEKOR/i, name: 'Ster-Kinekor' },
  { pattern: /NU ?METRO/i, name: 'Nu Metro' },
  { pattern: /CINEMA ?NOUVEAU/i, name: 'Cinema Nouveau' },
  { pattern: /NETFLIX/i, name: 'Netflix' },
  { pattern: /SHOWMAX/i, name: 'Showmax' },
  { pattern: /SPOTIFY/i, name: 'Spotify' },
  { pattern: /\bDSTV\b|MULTICHOICE/i, name: 'DStv' },
  { pattern: /PLAYSTATION/i, name: 'PlayStation' },
  { pattern: /\bPSN\b/i, name: 'PlayStation', headOnly: true },
  { pattern: /\bXBOX\b/i, name: 'Xbox' },
  { pattern: /NINTENDO/i, name: 'Nintendo' },
  { pattern: /STEAM ?GAMES|STEAMPOWERED/i, name: 'Steam' },
  { pattern: /COMPUTICKET|TICKETPRO|QUICKET/i, name: 'Computicket' },

  // ── Bicycle ──────────────────────────────────────────────────────────────
  { pattern: /CYCLE ?LAB/i, name: 'Cycle Lab' },
  { pattern: /CHRIS ?WILLEMSE/i, name: 'Chris Willemse Cycles' },
  { pattern: /\bCWC\b/i, name: 'Chris Willemse Cycles', headOnly: true },
  { pattern: /BIKE ?ADDICT/i, name: 'Bike Addict' },
  { pattern: /CAJEE'?S/i, name: 'Cajees Cycles' },
  { pattern: /OLYMPIC ?CYCLES/i, name: 'Olympic Cycles' },
  { pattern: /SOLOMON'?S ?CYCLES/i, name: "Solomon's Cycles" },
  { pattern: /LE ?PELOTON/i, name: 'Le Peloton' },
  { pattern: /EVO ?BIKES/i, name: 'Evobikes' },
  { pattern: /\bBICYCLE\b|\bCYCLERY\b|\bCYCLES\b/i, name: 'Bike shop', headOnly: true },

  // ── Pharmacy ─────────────────────────────────────────────────────────────
  { pattern: /\bCLICKS\b/i, name: 'Clicks', headOnly: true }, // "in two clicks"
  { pattern: /DIS-?CHEM/i, name: 'Dis-Chem' },
  { pattern: /MEDIRITE/i, name: 'Medirite' },
  { pattern: /ALPHA ?PHARM/i, name: 'Alpha Pharm' },

  // ── General retail ───────────────────────────────────────────────────────
  { pattern: /TAKEALOT/i, name: 'Takealot' },
  { pattern: /\bMAKRO\b/i, name: 'Makro' },
  { pattern: /\bBUILDERS\b ?(?:WAREHOUSE|EXPRESS)?/i, name: 'Builders' },
  { pattern: /LEROY ?MERLIN/i, name: 'Leroy Merlin' },
  { pattern: /SPORTSMAN'?S ?WAREHOUSE/i, name: "Sportsmans Warehouse" },
  { pattern: /CAPE ?UNION ?MART/i, name: 'Cape Union Mart' },
  { pattern: /MR ?PRICE/i, name: 'Mr Price' },
  { pattern: /\bMRP\b/i, name: 'Mr Price', headOnly: true },
  { pattern: /ACKERMANS/i, name: 'Ackermans' },
  { pattern: /\bPEP\b/i, name: 'PEP', headOnly: true },
  { pattern: /TRUWORTHS/i, name: 'Truworths' },
  { pattern: /INCREDIBLE ?CONNECTION/i, name: 'Incredible Connection' },
  { pattern: /HIFI ?CORP|HI-FI ?CORP/i, name: 'HiFi Corp' },
  { pattern: /\bGAME\b(?! ?MEAT)/i, name: 'Game', headOnly: true },

  // ── Utilities & telecom ──────────────────────────────────────────────────
  { pattern: /CITY ?OF ?CAPE ?TOWN/i, name: 'City of Cape Town' },
  { pattern: /\bCOCT\b/i, name: 'City of Cape Town', headOnly: true },
  { pattern: /\bESKOM\b/i, name: 'Eskom' },
  { pattern: /DRAKENSTEIN|STELLENBOSCH ?MUNI/i, name: 'Municipality' },
  { pattern: /VODACOM/i, name: 'Vodacom' },
  { pattern: /\bMTN\b/i, name: 'MTN', headOnly: true },
  { pattern: /TELKOM/i, name: 'Telkom' },
  { pattern: /CELL ?C/i, name: 'Cell C' },
  { pattern: /AFRIHOST/i, name: 'Afrihost' },
  { pattern: /WEB ?AFRICA/i, name: 'Webafrica' },
  { pattern: /\bRAIN\b/i, name: 'Rain', headOnly: true }, // ordinary English word
]

/**
 * Resolve a free-text vendor string — typed or edited by the user in the
 * transaction description, not necessarily anything the OCR pipeline ever
 * saw — to a canonical brand name via the same `BRANDS` table `findMerchant`
 * uses to parse receipt text. Returns the matched brand's `name`, or `null`
 * when nothing matches. First pattern to match wins, same ordering rule as
 * the parser.
 *
 * DELIBERATE DIFFERENCE from `findMerchant`: `headOnly` brands are NOT
 * skipped here. `headOnly` exists purely to stop generic-word aliases (PNP,
 * BP, Spur, Clicks, Rain, Game, PEP, MTN, PSN, MRP, COCT, CWC, Kauai, ...)
 * from false-matching somewhere in the body of a full OCR'd invoice, where
 * those words show up constantly as ordinary prose ("spur of the moment",
 * "in two clicks"). A short, user-typed vendor string ("BP garage", "Clicks
 * Tygervalley") IS effectively all header — the whole string is the vendor
 * name, there is no invoice body for it to false-match against — so
 * excluding `headOnly` brands here would wrongly reject exactly the inputs
 * this function exists to canonicalise. Do NOT "fix" this later by adding a
 * `headOnly` skip to bring it in line with `findMerchant`; that would
 * silently break canonicalisation for every generic-word brand above.
 */
export function canonicaliseVendor(text: string): string | null {
  for (const brand of BRANDS) {
    if (brand.pattern.test(text)) {
      return brand.name
    }
  }
  return null
}

/**
 * Normalise free-text vendor identifiers for use as a `VendorMapping` key:
 * uppercase, collapse internal whitespace, trim, strip trailing punctuation.
 *
 * Without this, "Shell", "Shell garage" and "shell" would fragment the same
 * vendor's learned counts across three separate rows instead of accumulating
 * on one. See docs/plans/2026-08-22-vendor-expense-category-design.md.
 */
export function normaliseVendorKey(text: string): string {
  return text
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/, '')
    .trim()
}
