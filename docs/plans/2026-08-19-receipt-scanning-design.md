# Receipt & Invoice Scanning — Design

**Date:** 2026-08-19
**Status:** Validated by spike; ready to implement
**Scope:** Transaction Tracker mode only. Yearly mode is explicitly out of scope.

## Goal

Photograph a South African till slip, or upload a delivery/utility invoice PDF, and have the
app pre-fill a `TransactionEntry` — merchant, amount, date — for confirmation before saving.

## Constraints (from Werner)

- **No LLM** and **no SaaS** — self-hosted libraries only.
- **Keep Node 22 and Docker.** (The spike also preserved the `node:22-alpine` base image.)
- Must be **decoupleable**: if server-side proves to be a problem, moving OCR to the browser
  must be cheap, not a rewrite.
- Runs on the VPS: 2 vCPU, 3.8 GB RAM, **~1.2 GB available**, 1–2 users, low frequency.

## Two input paths, one parser

The critical insight is that these are *not* the same problem:

| Source | What it is | Reader | Measured |
|---|---|---|---|
| Till slip photo (Spar, Shell, Checkers) | pixels only | **ppu-paddle-ocr** (PP-OCRv6, ONNX) | ~1.6 s, 201 MB, conf 0.948 |
| Sixty60 / Mr D / Takealot / municipal bill | PDF with embedded text layer | **unpdf** | ~70 ms, 70 MB, exact |

Routing a Takealot PDF through OCR would be a *downgrade* — it turns perfect text into a guess.
Both paths converge on the same `parseReceipt()` function.

## Stack

| Package | Role | Why it survives Alpine/musl |
|---|---|---|
| `ppu-paddle-ocr` (`/web` entry) | OCR via **WASM** ONNX runtime | WASM has no libc dependency |
| `ppu-ocv/canvas` | image decode; re-registered over the web platform via `setPlatform` | `@napi-rs/canvas-linux-x64-musl` |
| `sharp` | EXIF-rotate + downscale | ships musl prebuilds; matches ecom's existing pattern |
| `unpdf` | PDF text layer | pure JS, zero dependencies |

**`onnxruntime-node` must NOT be used** — it is glibc-only and fails on Alpine with
`Error loading shared library ld-linux-x86-64.so.2`. Verified in a real container.
The `/web` entry with WASM is what keeps the base image unchanged.

## Spike evidence

Measured inside `node:22-alpine`, capped to `--cpus=2 --memory=900m` to mirror the VPS.

Downscale sweep, 12 MP phone photo:

| Downscale | Time | Peak RAM | Confidence |
|---|---|---|---|
| none (3024×5376) | 2341 ms | **771 MB** | 0.937 |
| 2000 px | 1421 ms | 457 MB | 0.953 |
| 1600 px | 1068 ms | 406 MB | 0.939 |
| **1200 px (chosen)** | **911 ms** | **304 MB** | 0.931 |

Downscaling costs no accuracy and roughly halves time and memory. Raw 12 MP at 771 MB peak
would be genuinely unsafe on this box.

**Why 1200 and not lower.** The real Spar slip is 651×1156 and parsed correctly at native size,
so 651 is the proven *short* edge. `fit: 'inside'` caps the *long* edge, so `maxSide: 1200` turns
a 12 MP portrait photo into 675×1200 — a short edge just above what is proven. `maxSide: 900`
would produce 506×900, i.e. **below** the proven resolution. Text lines on the slip sit ~21 px
apart (glyphs ~14–16 px), already near the floor for reliable recognition; at 506 wide that drops
to ~11 px. 1200 is the lowest setting still backed by evidence. Raise it toward 1600 if faded or
crumpled slips start failing.

Real slip (`spar.jpeg`, WhatsApp-recompressed, shot at an angle on granite, 651×1156):

```
merchant : Spar Vredekloof
amount   : R 303.93   (30393 cents)
date     : 19/08/2026
evidence : brand "Spar" matched in "SPAR"
           total from TOTAL line "TOTAL FOR 7 ITEMS 303.93"; 2 line(s) agree
           date from "8816 005 251 19.08.26 17:54"
```

## Parser design

The engine returns lines as arrays of segments, each with `{ text, box{x,y,w,h}, confidence }`.
That geometry is what makes the parser tractable:

- **Total.** Find a line containing a standalone `TOTAL` token (excluding `SUBTOTAL`), take the
  **last** amount-shaped segment on that line. This defuses `TOTAL | FOR 7 ITEMS | 303.93`,
  where a naive "first number after TOTAL" regex would return `7`. Falls back to
  `TENDERED` / `AMOUNT DUE` / `BALANCE DUE`.
- **Corroboration as confidence.** On the Spar slip, `TOTAL`, `TENDERED Credit Card`, and the
  VAT table's `incl.` column all read 303.93. Agreement across lines raises confidence; a lone
  reading is scored lower and the confirm dialog highlights the amount field.
- **Merchant.** Brand alias table matched against the top third, plus a nearby all-caps line as
  the branch (`SPAR` + `VREDEKLOOF` → "Spar Vredekloof"). Unknown brands fall back to the first
  non-noise line, which the user can correct.
- **Date.** `DD.MM.YY` / `DD/MM/YYYY` / `DD-MM-YY`, preferring a `DATE`-labelled line.
  Parsed with **dayjs** and stored as a **unix timestamp in seconds**, per project convention.
- **Money** is converted to **cents** via the existing `randsToCents` convention.

## Decoupleability

This is a deliberate design constraint, not an accident. The revert to browser-side is ~1–2 hours
because of where code lives:

| Piece | On revert to browser |
|---|---|
| `shared/utils/receipt-parser.ts` | **no change** — pure function, auto-imported by client and Nitro alike |
| `unpdf` extraction | **no change** — runs in both runtimes |
| OCR import | `ppu-paddle-ocr/web` → same entry, already the web build |
| Call site | `$fetch('/api/receipts/scan')` → a `useReceiptScan()` composable |
| Models | serve from `/public` instead of the image |

**The rule that protects this:** nothing inside `shared/` may touch `fs`, `Buffer`, `sharp`, or a
file path. Pass `ArrayBuffer`. `sharp` stays on the server side of the seam; if OCR ever moves to
the browser, preprocessing moves to `ppu-ocv`, which runs in both.

## File layout

```
shared/utils/receipt-parser.ts      # pure: lines -> { merchant, amountCents, dateText, confidence }
shared/utils/receipt-types.ts       # OcrLine, OcrSegment, ParsedReceipt
server/utils/receipt-ocr.ts         # lazy init, per-scan destroy, single-flight mutex
server/utils/receipt-pdf.ts         # unpdf text layer -> line shape
server/api/receipts/scan.post.ts    # multipart upload -> sniff -> extract -> parse
app/components/ReceiptScanButton.vue
app/components/ReceiptConfirmDialog.vue
prisma/schema.prisma                # + MerchantCategoryRule
```

## Upload endpoint

Reuses the **shape** of `ecommerce-template/server/api/upload/image.post.ts` (not the code —
budgeting uses `errors.validationError`, ecom uses `throwValidationError`):

- `readMultipartFormData(event)`
- validate by **magic bytes** via `sharp().metadata()`, never the client-supplied MIME type
- size cap from `runtimeConfig`
- `.rotate()` to honour EXIF orientation — without it, sideways phone photos OCR badly
- `.resize(receiptMaxDimension, receiptMaxDimension, { fit: 'inside', withoutEnlargement: true })`

`receiptMaxDimension` is a **`runtimeConfig` value defaulting to 1200**, not a literal — so it can
be raised to 1600 by env var if faded slips start failing, with no code change or rebuild.

Accepts JPEG/PNG/WebP/TIFF/AVIF and PDF. Ownership is enforced through the existing
`profileToken` chain, exactly as `transactions/index.post.ts` does.

## Category learning

`TransactionCategory` rows are **per-month**, so a rule cannot store a `categoryId` — it would
dangle next month. The rule stores the category **name** and resolves it against the current
month's categories at scan time; if no category of that name exists in this month, the dialog
opens with the dropdown blank.

```prisma
model MerchantCategoryRule {
  id           Int    @id @default(autoincrement())
  profileToken String @map("profile_token")
  merchant     String                          // normalised, e.g. "spar"
  categoryName String @map("category_name")
  createdAt    Int    @map("created_at")
  updatedAt    Int    @map("updated_at")

  profile Profile @relation(fields: [profileToken], references: [profileToken], onDelete: Cascade)

  @@unique([profileToken, merchant])
  @@map("merchant_category_rules")
  @@schema("budgeting")
}
```

First Shell slip: user picks "Fuel", rule is written. Every later Shell slip pre-selects Fuel.
Changing the category on a later scan overwrites the rule.

## Receipt images are discarded

Parsed, then thrown away. Nothing written to disk: no storage growth, no backup bloat, nothing
extra to secure. The physical slip or the original email remains the record of proof.

## Operational notes

- **Bake the models into the image.** They are fetched from GitHub at runtime (~8 MB) and cached
  to `~/.cache/ppu-paddle-ocr`. Left alone, the first scan after every container restart needs
  internet and pays a cold hit. `ModelPathOptions` accepts local file paths — copy them in at
  build time and pass paths.
- **Single-flight mutex.** ~300 MB × 2 concurrent scans would hurt on a 1.2 GB box. With 1–2 users
  a "one scan at a time" lock is sufficient and costs nothing in practice.
- **Destroy the session per scan** (`svc.destroy()`) so memory is transient, not resident.
- Revisit native `onnxruntime-node` on `node:22-slim` only if WASM latency becomes a problem —
  it is roughly 1.5× faster but forfeits the Alpine base image.

## Error handling

| Case | Behaviour |
|---|---|
| Unreadable / unsupported file | 422 with a clear message; nothing saved |
| PDF has no text layer (scanned bill) | render page to image, fall through to the OCR path |
| No total found | dialog opens with amount blank and focused — never guess |
| Low confidence or no corroboration | dialog flags the field; user confirms or corrects |
| OCR throws | 500 via `errors.serverError`; session still destroyed in `finally` |
| Scan already running | 409, or client-side queue — never run two at once |

**The confirm step is mandatory.** No scan writes a transaction directly. Faded thermal paper is
an information-loss problem no engine can fix, so a human check is always the last step.

## Growing the fixture set

Only one real slip exists today (Spar Vredekloof). Fuel, Checkers, and utility layouts will
arrive as Werner shops. The parser must therefore be cheap to extend, so capturing a new slip is
a two-minute job, not a debugging session:

```bash
pnpm receipt:fixture ~/Downloads/shell-slip.jpeg    # OCR once, write the line array to disk
```

The script runs the image through the real pipeline and writes
`test/fixtures/receipts/<name>.json` — the captured `lines` array plus the parse result. The
developer then fills in the expected merchant / amount / date. Tests iterate every fixture file,
so **adding a slip means adding one JSON file and three expected values** — no new test code.

Because fixtures are captured OCR output, the test suite needs **no model, no image decoding, and
no network**, and runs in milliseconds. This also means a slip that once failed stays a permanent
regression test after the parser is fixed.

Expect the alias table and the TOTAL heuristics to need real tuning per retailer — a fuel slip
puts the amount in a different place than a grocery till slip. That is the expected cost of the
no-LLM approach, and it is paid down one fixture at a time.

## Testing

- **Parser unit tests** are the priority — pure function, no I/O, fast. Cover: the `TOTAL FOR 7 ITEMS` trap, voided
  items (`+25.99` / `-25.99` pairs), `Today SPAR Saved You 13.00` as a decoy amount, missing
  total, `DD.MM.YY` vs `DD/MM/YYYY`, unknown merchant fallback.
- **One integration test** per path (image, PDF) against committed sample files.
- Browser verification of the capture → confirm → save flow per project policy.

## Out of scope

- Yearly Overview mode — explicitly excluded.
- Line-item extraction. Only merchant, total, and date are needed.
- Storing receipt images.
- Any browser-side OCR, until/unless the server path proves unsatisfactory.
