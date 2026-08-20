# Receipt & Invoice Scanning — Design

**Date:** 2026-08-19
**Status:** Working on dev and on the production QA image — parser, brand table, scan endpoint, OCR service and the full-width scan modal. Not yet deployed. One gap against this document: a partial scan reports what it could not read but does NOT focus the offending field.
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
  the branch (`SPAR` + `VREDEKLOOF` → "Spar Vredekloof"). If the top third finds no brand, the
  search widens to the **whole document minus priced line items** — emailed invoices put the
  logo in the footer, and `SPAR LONG LIFE MILK 21.99` is stock on a shelf, not the store. A
  footer match contributes no branch, because the header lines above it are unrelated to it.
  Unknown brands still fall back to the first non-noise line, which the user can correct.
- **Date.** `DD.MM.YY` / `DD/MM/YYYY` / `DD-MM-YY`, `YYYY-MM-DD` (read year-first, the one
  unambiguous form), and spelled-out months in either order — `17 Aug, 2026`, `3 May 2026`,
  `21st Jul 26`, `Aug 17, 2026` — in English and Afrikaans. The text forms are what delivery
  invoices (Sixty60, Mr D, Takealot) use; they never print `dd/mm/yy`. A `DATE`-labelled line is
  preferred. Parsed with **dayjs** (strict, so `31 Jun` is rejected rather than rolled over) and
  stored as a **unix timestamp in seconds**, per project convention.
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
shared/utils/receipt-parser.ts      # pure: lines -> merchant / amountCents / date / confidence
shared/utils/receipt-merchants.ts   # SA brand table + kinds + category classification
shared/utils/receipt-types.ts       # OcrLine, OcrSegment, ParsedReceipt, MerchantKind
server/utils/receipt-ocr.ts         # warm session, awaited mutex, idle release
server/utils/receipt-pdf.ts         # unpdf text layer -> line shape
server/api/receipts/scan.post.ts    # multipart upload -> sniff -> extract -> parse
app/components/ReceiptScanModal.vue # dropzone -> scan -> image/fields review
scripts/receipt-fixture.mjs         # capture a slip as a test fixture
test/fixtures/receipts/*.json       # captured slips
                                    # (no prisma change — see "No schema change" below)
```

## Loading the baked models — buffers, never paths

`ppu-paddle-ocr/web` resolves a **string** model source by handing it to `fetch()`. That is fine
for an `https://` preset URL and fatal for a local path: `/app/models/PP-OCRv6_tiny_det.ort`
throws `TypeError: Failed to parse URL`, and the scan endpoint 500s on every request.

The library only reads a local file through its `source instanceof ArrayBuffer` branch, so
`server/utils/receipt-ocr.ts` reads the three files itself and passes buffers.

**This failed *only* on the built image.** Dev leaves `receiptModelDir` empty and falls back to
the library's own download-and-cache, so it never touched the broken path — `pnpm qa:up` is what
caught it. Treat that as the rule, not the exception: the baked-model path has no dev equivalent.

## The production image needs TWO things Nitro will not give you

Both of these failed **only** on the built image, and both were found by `pnpm qa:up` after
dev, `pnpm test` and `pnpm typecheck` were all green.

**1. The ONNX WASM runtime is not traced.** Nitro externalises `onnxruntime-web` and copies only
the statically resolvable entry, `ort.node.min.mjs`. The actual backend is reached by *dynamic*
import, so `ort-wasm-simd-threaded.{mjs,wasm}` is silently left behind and `initialize()` dies
with `no available backend found` → `ERR_MODULE_NOT_FOUND`. There is no CDN fallback —
`applyDefaultWasmPaths()` only sets `wasmPaths` when `window` exists, so under Node it is fatal.
The Dockerfile stages the pair explicitly (`cp -L`, because pnpm's `node_modules` entry is a
symlink) and copies it into `.output/server/node_modules/onnxruntime-web/dist/`. Only the base
simd-threaded pair is taken: the jsep/jspi/asyncify variants are GPU builds this CPU-only path
never loads and would add ~66 MB.

**2. Baked models must be passed as buffers, never paths.** See the section above.

### The acceptance test

**"The container boots" and "the endpoint returns 401 not 500" prove nothing about OCR.** Both
were true while every scan was guaranteed to fail. The real check is to run a recognition inside
the running image:

```bash
docker exec budgeting-qa node -e '...'   # initialize() + recognize() on a real slip
```

Expect roughly `39 lines, confidence 0.948, ~800ms` for `spar-slip.jpeg` — the same numbers dev
produces. Anything that only exercises HTTP status codes is not evidence.

### Memory

Measured in the container after one scan: **RSS ~523 MB**. Higher than the ~300 MB the downscale
sweep predicted, because ORT's WASM linear memory is not returned to the OS when a session is
released — `destroy()` frees inside the heap, so RSS plateaus rather than drops. Fine for 1–2
users on the VPS, but it is the number to watch if anything else moves onto that box.

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

## No schema change — the category is implicit

An earlier draft of this design added a `MerchantCategoryRule` table so scans
could learn which category a merchant belongs to. **That has been dropped.**

The add-transaction UI is an inline form rendered *inside each category card*
(`TransactionList` receives `:category-id` from `BudgetCategoryCard`). A scan
launched from the Groceries card is therefore already in the right category —
there is nothing to learn and nothing to guess.

**This feature makes no schema change and requires no migration.** It is purely
additive, which also means it carries no production-database risk.

## Category mismatch warning

Instead of learning, the parser reports what a merchant normally *is*
(`merchantKind`), taken from the brand table in `shared/utils/receipt-merchants.ts`.
The confirm panel shows a category dropdown defaulting to the card you launched
from, and warns when the two disagree:

```
Category:  [ Groceries      v ]
⚠ This looks like a fuel slip.
```

`isCategoryMismatch()` returns true **only when both sides are known and differ**.
An unrecognised merchant, or a category named "Werner misc" that
`classifyCategoryName()` cannot classify, stays silent. The warning never blocks
submission — buying milk at a Shell garage is legitimate.

Reassigning the category needs **no new state code**: `createTransaction(data)`
already takes `categoryId` and its optimistic update maps across every category
in the month before calling `recalculateSummary()`, so both the old and new cards
update themselves.

## Confirm UI — a modal, not the inline card form

**Revised 2026-08-19 after seeing it running.** The first implementation prefilled the existing
inline add-transaction form inside the category card. That card is a narrow grid column, so the
slip rendered as a ~160px thumbnail — far too small to check a total against, which defeats the
entire point of showing the image.

The whole scan flow now lives in its own modal (`Teleport to="body"` + fixed overlay +
click-outside to dismiss, matching `ConfirmDialog.vue`):

```
+- Scan Receipt --------------------------------------------- X -+
|                                                                |
|  +--------------------+   Description                          |
|  |                    |   [ Spar Vredekloof              ]     |
|  |   slip image       |   Amount            Date               |
|  |   ~460px wide      |   [ 303.93    ]    [ 19 Aug 2026 ]     |
|  |   up to 70vh tall  |   Category                             |
|  |   click = lightbox |   [ Groceries                  v ]     |
|  +--------------------+                                        |
|                                        [ Cancel ]  [ Add ]     |
+----------------------------------------------------------------+
```

- `max-w-5xl`, `max-h-[90vh]`; two columns on desktop, stacked (image on top) on mobile.
- **The dropzone lives in the modal too.** Clicking Scan opens the modal showing a large drop
  target; after a successful scan the same modal switches to the review layout. One surface, and
  the drag target is big enough to actually aim at.
- Clicking the image opens it full size in the `UModal fullscreen` lightbox already used by
  `guide.vue` — needed for faded thermal print.
- The category card keeps two buttons: **Add Transaction** (the unchanged inline form, for manual
  entry) and **Scan** (opens this modal).

The modal emits the confirmed values; `TransactionList` still owns `createTransaction`, so
reassigning the category continues to work through the existing optimistic path.

## Receipt images are never persisted

The preview shown next to the prefilled fields comes from the local `File` via
`URL.createObjectURL` — the server never sends an image back. Nitro holds the bytes in memory
only for the duration of the scan.

"Deleting the image" is therefore just `revokeObjectURL()` and dropping the reference on submit
or cancel. Nothing is written to disk: no storage growth, no backup bloat, nothing extra to
secure. The physical slip or the original email remains the record of proof.

## Operational notes

- **Bake the models into the image.** They are fetched from GitHub at runtime (~8 MB) and cached
  to `~/.cache/ppu-paddle-ocr`. Left alone, the first scan after every container restart needs
  internet and pays a cold hit. `ModelPathOptions` accepts local file paths — copy them in at
  build time and pass paths.
- **Serialise scans with an awaited mutex — queue, do not reject.** A second
  concurrent scan waits for the lock and then runs normally; it does not get a
  409. Serialising is what pins peak memory at ~300 MB instead of 600 MB+ on a
  1.2 GB box, so this stays correct regardless of user count — more users would
  simply queue. A ~30 s acquire timeout is the safety valve: a wedged scan
  degrades to one clear error rather than a pile of hung requests.
- **Keep the OCR session warm for `NUXT_RECEIPT_IDLE_MS` (default 120 s), then
  release it.** Initialisation costs ~1.3 s under WASM. The real usage pattern is
  a batch — sitting down with a week of slips — so a per-scan destroy would pay
  that cost on every slip. Reuse a live session, cancel the pending release
  timer on entry, and re-arm it in the `finally`. After the idle window the
  ~170 MB is handed back. The mutex already guarantees at most one session
  exists, so this adds no memory beyond the idle window itself.
- Revisit native `onnxruntime-node` on `node:22-slim` only if WASM latency becomes a problem —
  it is roughly 1.5× faster but forfeits the Alpine base image.

## Error handling

Failure is a spectrum, not a boolean, and **the form always opens** — a partial
scan still saves typing, and a total failure should never dead-end the user.

| Case | Behaviour |
|---|---|
| Clean scan | all three fields prefilled |
| Total found, merchant unknown | amount + date filled; description blank and focused |
| No total found | amount blank and focused — never guess a number |
| Low confidence / no corroboration | fields filled, amount highlighted for a second look |
| PDF has no text layer (scanned bill) | render page to image, fall through to the OCR path |
| Unreadable / unsupported file | error shown on the dropzone, **form opens blank** so the slip can be entered by hand or the scan retried |
| OCR throws | 500 via `errors.serverError`; session released in `finally`; form opens blank |
| Another scan in flight | request waits on the mutex, then runs — no error |

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
- Learning merchant -> category rules (dropped; the category is implicit).
- Any schema change or migration.
- Any browser-side OCR, until/unless the server path proves unsatisfactory.
