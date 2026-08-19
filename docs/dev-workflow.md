# Dev Workflow

Day-to-day developer howtos. For environments, deploys and the dev→qa→prod gate,
see [`docs/devops/lifecycle.md`](./devops/lifecycle.md).

## Tests

```bash
pnpm test          # all tests
pnpm test -- --test-name-pattern="total extraction"    # one suite
```

Uses Node 22's built-in `node:test` via `tsx` — no vitest, no jest, no extra
dependencies. Tests are pure: no database, no network, no browser. The whole
suite runs in well under a second, so run it freely.

## Receipt scanning: capturing a new slip

**This is the thing to remember.** The receipt parser is heuristic, not an LLM —
so it learns new retailer layouts only when you feed it real slips. Every slip
you capture becomes a permanent regression test.

### Why bother

Right now the parser has seen exactly **one** real layout (Spar Vredekloof). A
Shell fuel slip puts the amount somewhere else entirely; Checkers, Woolworths and
municipal bills all differ. When a scan gets something wrong, capturing it is how
you fix it permanently instead of fixing it twice.

### How to capture one

```bash
pnpm receipt:fixture <path-to-image> [name]
```

Real example, straight from the Windows Downloads folder:

```bash
pnpm receipt:fixture "/mnt/c/Users/Bullzeye/Downloads/shell-slip.jpeg" shell-n1-city
```

That will:

1. Downscale exactly the way the server does (EXIF-rotate, longest edge 1200px)
2. Run OCR once
3. Write `test/fixtures/receipts/shell-n1-city.json`
4. Pre-fill the `expected` block with the parser's **current guess** and print
   the evidence trail explaining how it got there

Output looks like:

```
OCR      39 lines, confidence 0.948, 821ms

Parser guess (pre-filled into "expected" — CHECK IT against the slip):
  merchant   : Spar Vredekloof
  amountCents: 30393  (R 303.93)
  dateText   : 19/08/2026
  · amount: from TOTAL row "TOTAL FOR 7 ITEMS 303.93"; 2 row(s) agree
```

### Then — the important bit

**Check the guess against the actual slip.** The `expected` block is pre-filled
with what the parser *currently* produces, which is a convenience, not a
verification. If it is wrong, correct it by hand:

```jsonc
"expected": {
  "merchant": "Shell N1 City",
  "amountCents": 85000,      // cents, always
  "dateText": "19/08/2026"   // DD/MM/YYYY, always
}
```

Then `pnpm test`. A corrected fixture will **fail** until the parser is improved
to handle that layout — which is exactly the point. Fix
`shared/utils/receipt-parser.ts`, re-run, and the slip is handled forever.

### Fixtures need no model or image at test time

The JSON stores the recognised text lines, so tests replay them directly. Adding
a slip means **one JSON file and three expected values** — never new test code.
Keep the original image out of the repo; the fixture is the artifact.

## Where receipt code lives

| Path | Role |
|---|---|
| `shared/utils/receipt-parser.ts` | pure parser — text lines → merchant / amount / date |
| `shared/utils/receipt-types.ts` | shared types |
| `scripts/receipt-fixture.mjs` | the capture command above |
| `test/fixtures/receipts/*.json` | captured slips |
| `test/receipt-parser.test.ts` | fixture replay + trap cases |

**Rule for `shared/`:** nothing in there may import `fs`, `Buffer`, `sharp`, or a
file path. It must run unchanged in both Nitro and the browser — that is what
keeps the option open to move OCR client-side later without a rewrite. Image
handling stays on the server side of that line.

## Tuning OCR without a rebuild

`NUXT_RECEIPT_MAX_DIMENSION` (default **1200**) sets the longest edge images are
downscaled to before OCR. Raise it to 1600 if faded or crumpled slips start
failing; it costs roughly +100 MB peak RAM and +150 ms per scan.

Do not go below 1200. The one slip we have measured is 651px on its short edge
and parses correctly; at `maxDimension: 900` a portrait photo lands at 506px
short edge — below what is proven, with glyphs around 11px where recognition
starts to break down.

## Gotchas

- **Money is cents** everywhere. Use `randsToCents` / `centsToRands`.
- **Dates are unix seconds (`Int`)** in this project. It is the only one of
  Werner's projects that does this — ecommerce-template and online-tutoring-app
  both use `timestamptz`. Budgeting stays on unix seconds deliberately (25
  columns across 16 models); do not "fix" it.
- **Never use `onnxruntime-node`.** It is glibc-only and fails on the
  `node:22-alpine` image with `ld-linux-x86-64.so.2: No such file`. Always import
  `ppu-paddle-ocr/web` (WASM) plus `ppu-ocv/canvas`.
