/**
 * South African merchant brand table and category classification.
 *
 * This is the file that grows. When a slip comes back with the wrong (or no)
 * merchant, add a pattern here and capture a fixture — see docs/dev-workflow.md.
 *
 * Ordering matters: the first pattern to match wins, so put specific patterns
 * above general ones. Patterns are matched only against the TOP THIRD of a
 * receipt, which is why short generic words are tolerable here but still risky.
 */

/** What a merchant is normally used for. Drives the category mismatch warning. */
export type MerchantKind =
  | 'groceries'
  | 'fuel'
  | 'eating-out'
  | 'entertainment'
  | 'bicycle'
  | 'pharmacy'
  | 'retail'
  | 'utilities'

export interface Brand {
  pattern: RegExp
  name: string
  kind: MerchantKind
}

/**
 * DANGER: never add a bare /TOTAL/ pattern for TotalEnergies fuel — the word
 * TOTAL appears on virtually every till slip and would match constantly.
 * Likewise avoid bare /OK/, /PUMA/, /APPLE/ and other common words.
 */
export const BRANDS: readonly Brand[] = [
  // ── Groceries ────────────────────────────────────────────────────────────
  { pattern: /\b(SUPER ?SPAR|KWIK ?SPAR|SAVEMOR|SPAR)\b/i, name: 'Spar', kind: 'groceries' },
  { pattern: /\bCHECKERS\b|SIXTY ?60|HYPER ?CHECKERS/i, name: 'Checkers', kind: 'groceries' },
  { pattern: /\bSHOPRITE\b/i, name: 'Shoprite', kind: 'groceries' },
  { pattern: /\bUSAVE\b|\bU-SAVE\b/i, name: 'Usave', kind: 'groceries' },
  { pattern: /PICK ?N ?PAY|\bPNP\b/i, name: 'Pick n Pay', kind: 'groceries' },
  { pattern: /\bBOXER\b/i, name: 'Boxer', kind: 'groceries' },
  { pattern: /FOOD ?LOVER|FRUIT ?& ?VEG CITY/i, name: "Food Lover's Market", kind: 'groceries' },
  { pattern: /WOOLWORTHS|\bWOOLIES\b/i, name: 'Woolworths', kind: 'groceries' },
  { pattern: /OK ?(FOODS|GROCER|MINIMARK|URBAN)/i, name: 'OK Foods', kind: 'groceries' },
  { pattern: /CAMBRIDGE ?FOOD/i, name: 'Cambridge Food', kind: 'groceries' },
  { pattern: /\bFRESH ?STOP\b/i, name: 'FreshStop', kind: 'groceries' },
  { pattern: /\bWOOLWORTHS ?FOOD\b/i, name: 'Woolworths', kind: 'groceries' },

  // ── Fuel ─────────────────────────────────────────────────────────────────
  { pattern: /\bSHELL\b/i, name: 'Shell', kind: 'fuel' },
  { pattern: /\bENGEN\b/i, name: 'Engen', kind: 'fuel' },
  { pattern: /\bSASOL\b/i, name: 'Sasol', kind: 'fuel' },
  { pattern: /\bCALTEX\b/i, name: 'Caltex', kind: 'fuel' },
  { pattern: /\bASTRON\b/i, name: 'Astron Energy', kind: 'fuel' },
  { pattern: /PUMA ?ENERGY/i, name: 'Puma Energy', kind: 'fuel' },
  { pattern: /TOTAL ?ENERGIES/i, name: 'TotalEnergies', kind: 'fuel' }, // never bare /TOTAL/
  { pattern: /\bBP\b/i, name: 'BP', kind: 'fuel' },

  // ── Eating out ───────────────────────────────────────────────────────────
  { pattern: /NANDO'?S/i, name: "Nando's", kind: 'eating-out' },
  { pattern: /\bSTEERS\b/i, name: 'Steers', kind: 'eating-out' },
  { pattern: /\bWIMPY\b/i, name: 'Wimpy', kind: 'eating-out' },
  { pattern: /\bKFC\b/i, name: 'KFC', kind: 'eating-out' },
  { pattern: /MC ?DONALD/i, name: "McDonald's", kind: 'eating-out' },
  { pattern: /BURGER ?KING/i, name: 'Burger King', kind: 'eating-out' },
  { pattern: /DEBONAIRS/i, name: 'Debonairs', kind: 'eating-out' },
  { pattern: /ROMAN'?S ?PIZZA/i, name: "Roman's Pizza", kind: 'eating-out' },
  { pattern: /PIZZA ?HUT/i, name: 'Pizza Hut', kind: 'eating-out' },
  { pattern: /DOMINO'?S/i, name: "Domino's", kind: 'eating-out' },
  { pattern: /CHICKEN ?LICKEN/i, name: 'Chicken Licken', kind: 'eating-out' },
  { pattern: /FISHAWAYS/i, name: 'Fishaways', kind: 'eating-out' },
  { pattern: /ROCO ?MAMAS/i, name: 'RocoMamas', kind: 'eating-out' },
  { pattern: /\bSPUR\b/i, name: 'Spur', kind: 'eating-out' },
  { pattern: /OCEAN ?BASKET/i, name: 'Ocean Basket', kind: 'eating-out' },
  { pattern: /PANAROTTI/i, name: 'Panarottis', kind: 'eating-out' },
  { pattern: /JOHN ?DORY/i, name: "John Dory's", kind: 'eating-out' },
  { pattern: /COL'?CACCHIO/i, name: "Col'Cacchio", kind: 'eating-out' },
  { pattern: /SIMPLY ?ASIA/i, name: 'Simply Asia', kind: 'eating-out' },
  { pattern: /\bKAUAI\b/i, name: 'Kauai', kind: 'eating-out' },
  { pattern: /MUGG ?& ?BEAN|MUGG ?AND ?BEAN/i, name: 'Mugg & Bean', kind: 'eating-out' },
  { pattern: /VIDA ?E? ?CAFF?E/i, name: 'Vida e Caffè', kind: 'eating-out' },
  { pattern: /SEATTLE ?COFFEE/i, name: 'Seattle Coffee', kind: 'eating-out' },
  { pattern: /BOOTLEGGER/i, name: 'Bootlegger', kind: 'eating-out' },
  { pattern: /STARBUCKS/i, name: 'Starbucks', kind: 'eating-out' },
  { pattern: /KRISPY ?KREME/i, name: 'Krispy Kreme', kind: 'eating-out' },
  { pattern: /UBER ?EATS/i, name: 'Uber Eats', kind: 'eating-out' },
  { pattern: /\bMR ?D\b|MR ?D ?FOOD|MR DELIVERY/i, name: 'Mr D', kind: 'eating-out' },
  { pattern: /BOLT ?FOOD/i, name: 'Bolt Food', kind: 'eating-out' },

  // ── Entertainment ────────────────────────────────────────────────────────
  { pattern: /STER[- ]?KINEKOR/i, name: 'Ster-Kinekor', kind: 'entertainment' },
  { pattern: /NU ?METRO/i, name: 'Nu Metro', kind: 'entertainment' },
  { pattern: /CINEMA ?NOUVEAU/i, name: 'Cinema Nouveau', kind: 'entertainment' },
  { pattern: /NETFLIX/i, name: 'Netflix', kind: 'entertainment' },
  { pattern: /SHOWMAX/i, name: 'Showmax', kind: 'entertainment' },
  { pattern: /SPOTIFY/i, name: 'Spotify', kind: 'entertainment' },
  { pattern: /\bDSTV\b|MULTICHOICE/i, name: 'DStv', kind: 'entertainment' },
  { pattern: /PLAYSTATION|\bPSN\b/i, name: 'PlayStation', kind: 'entertainment' },
  { pattern: /\bXBOX\b/i, name: 'Xbox', kind: 'entertainment' },
  { pattern: /NINTENDO/i, name: 'Nintendo', kind: 'entertainment' },
  { pattern: /STEAM ?GAMES|STEAMPOWERED/i, name: 'Steam', kind: 'entertainment' },
  { pattern: /COMPUTICKET|TICKETPRO|QUICKET/i, name: 'Computicket', kind: 'entertainment' },

  // ── Bicycle ──────────────────────────────────────────────────────────────
  { pattern: /CYCLE ?LAB/i, name: 'Cycle Lab', kind: 'bicycle' },
  { pattern: /CHRIS ?WILLEMSE|\bCWC\b/i, name: 'Chris Willemse Cycles', kind: 'bicycle' },
  { pattern: /BIKE ?ADDICT/i, name: 'Bike Addict', kind: 'bicycle' },
  { pattern: /CAJEE'?S/i, name: 'Cajees Cycles', kind: 'bicycle' },
  { pattern: /OLYMPIC ?CYCLES/i, name: 'Olympic Cycles', kind: 'bicycle' },
  { pattern: /SOLOMON'?S ?CYCLES/i, name: "Solomon's Cycles", kind: 'bicycle' },
  { pattern: /LE ?PELOTON/i, name: 'Le Peloton', kind: 'bicycle' },
  { pattern: /EVO ?BIKES/i, name: 'Evobikes', kind: 'bicycle' },
  { pattern: /\bBICYCLE\b|\bCYCLERY\b|\bCYCLES\b/i, name: 'Bike shop', kind: 'bicycle' },

  // ── Pharmacy ─────────────────────────────────────────────────────────────
  { pattern: /\bCLICKS\b/i, name: 'Clicks', kind: 'pharmacy' },
  { pattern: /DIS-?CHEM/i, name: 'Dis-Chem', kind: 'pharmacy' },
  { pattern: /MEDIRITE/i, name: 'Medirite', kind: 'pharmacy' },
  { pattern: /ALPHA ?PHARM/i, name: 'Alpha Pharm', kind: 'pharmacy' },

  // ── General retail ───────────────────────────────────────────────────────
  { pattern: /TAKEALOT/i, name: 'Takealot', kind: 'retail' },
  { pattern: /\bMAKRO\b/i, name: 'Makro', kind: 'retail' },
  { pattern: /BUILDERS ?(WAREHOUSE|EXPRESS)?/i, name: 'Builders', kind: 'retail' },
  { pattern: /LEROY ?MERLIN/i, name: 'Leroy Merlin', kind: 'retail' },
  { pattern: /SPORTSMAN'?S ?WAREHOUSE/i, name: "Sportsmans Warehouse", kind: 'retail' },
  { pattern: /CAPE ?UNION ?MART/i, name: 'Cape Union Mart', kind: 'retail' },
  { pattern: /MR ?PRICE|\bMRP\b/i, name: 'Mr Price', kind: 'retail' },
  { pattern: /ACKERMANS/i, name: 'Ackermans', kind: 'retail' },
  { pattern: /\bPEP\b/i, name: 'PEP', kind: 'retail' },
  { pattern: /TRUWORTHS/i, name: 'Truworths', kind: 'retail' },
  { pattern: /INCREDIBLE ?CONNECTION/i, name: 'Incredible Connection', kind: 'retail' },
  { pattern: /HIFI ?CORP|HI-FI ?CORP/i, name: 'HiFi Corp', kind: 'retail' },
  { pattern: /\bGAME\b(?! ?MEAT)/i, name: 'Game', kind: 'retail' },

  // ── Utilities & telecom ──────────────────────────────────────────────────
  { pattern: /CITY ?OF ?CAPE ?TOWN|\bCOCT\b/i, name: 'City of Cape Town', kind: 'utilities' },
  { pattern: /\bESKOM\b/i, name: 'Eskom', kind: 'utilities' },
  { pattern: /DRAKENSTEIN|STELLENBOSCH ?MUNI/i, name: 'Municipality', kind: 'utilities' },
  { pattern: /VODACOM/i, name: 'Vodacom', kind: 'utilities' },
  { pattern: /\bMTN\b/i, name: 'MTN', kind: 'utilities' },
  { pattern: /TELKOM/i, name: 'Telkom', kind: 'utilities' },
  { pattern: /CELL ?C/i, name: 'Cell C', kind: 'utilities' },
  { pattern: /AFRIHOST/i, name: 'Afrihost', kind: 'utilities' },
  { pattern: /WEB ?AFRICA/i, name: 'Webafrica', kind: 'utilities' },
  { pattern: /\bRAIN\b/i, name: 'Rain', kind: 'utilities' },
]

/**
 * Classify a user-defined budget category name.
 *
 * Category names are free text ("Eating Out", "Fuel & Transport", "Bike stuff"),
 * so this is best-effort. Returns null when unsure — the caller must stay silent
 * rather than warn on a guess.
 */
const CATEGORY_PATTERNS: ReadonlyArray<readonly [RegExp, MerchantKind]> = [
  [/fuel|petrol|diesel|garage|gas\b|transport/i, 'fuel'],
  [/eat|restaurant|dining|takeaway|take-?away|coffee|food ?out|lunch|dinner/i, 'eating-out'],
  [/grocer|food|supermarket|household|pantry/i, 'groceries'],
  [/entertain|movie|cinema|stream|subscription|gaming|games/i, 'entertainment'],
  [/bicycle|bike|cycling|cycle/i, 'bicycle'],
  [/pharma|health|medic|chemist|doctor/i, 'pharmacy'],
  [/util|electric|water|municipal|rates|internet|airtime|data|phone/i, 'utilities'],
]

export function classifyCategoryName(name: string): MerchantKind | null {
  // Ordered: "food out" must beat "food", "bike" must beat nothing else.
  for (const [pattern, kind] of CATEGORY_PATTERNS) {
    if (pattern.test(name)) return kind
  }
  return null
}

/**
 * True only when we are confident the merchant and the chosen budget category
 * disagree. Unknown on either side returns false — never cry wolf.
 */
export function isCategoryMismatch(
  merchantKind: MerchantKind | null | undefined,
  categoryName: string,
): boolean {
  if (!merchantKind) return false
  const categoryKind = classifyCategoryName(categoryName)
  if (!categoryKind) return false
  return categoryKind !== merchantKind
}
