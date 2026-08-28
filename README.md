# Statement Bridge

A tool for converting bank statement PDFs into CSV, QBO, and Xero-ready files for
bookkeeping - entirely in the browser, no upload, no account.

**Status: early MVP.** A generic parser and CSV export work today (see below). Per-bank
parsers and QBO/Xero export are not built yet.

## The plan

Most free statement-to-CSV converters either upload your PDF to a server or only handle one
bank's layout well. The plan for this tool is to keep everything client-side (nothing about a
statement's contents ever leaves the browser) and to cover the highest-volume US bank
statement formats directly, with a generic fallback parser for anything else - plus a
mandatory review step before any file is exported, since a silently wrong row in someone's
books is a real cost, not just an inconvenience.

## What works today

- Drop in a digital (text-layer) bank statement PDF.
- A generic fallback parser looks for lines shaped like `date  description  amount` (and
  `date  description  amount  running-balance`) - the layout most US bank/card statements
  share, regardless of which bank issued them.
- Every parsed row is shown in an editable review table before anything can be exported - you
  can fix or remove any row, and export stays disabled until you confirm you've checked the
  results against your original statement.
- Export to CSV.

## What doesn't work yet

- No per-bank parsers - the generic parser is a fallback, not a replacement for one, and will
  miss anything that doesn't fit its "date, description, amount(s)" heuristic.
- No QBO (QuickBooks) or Xero export yet - CSV only.
- No scanned/image PDF support (no text layer to read) - by design, to keep everything
  client-side rather than adding a server-side OCR step.

## Development

```
npm install
npm run dev      # local dev server
npm test         # unit tests (parser + CSV export logic)
npm run build    # production build
```

## What this deliberately does not do, yet

No accounts, no server-side component, no payment, and nothing deployed live.
