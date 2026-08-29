# Statement Bridge

A tool for converting bank statement PDFs into CSV, QBO, and Xero-ready files for
bookkeeping - entirely in the browser, no upload, no account.

**Status: early version.** Six bank-specific parsers, a generic fallback parser, and export to
CSV, QBO (QuickBooks), and Xero's CSV format all work today (see below).

## The plan

Most free statement-to-CSV converters either upload your PDF to a server or only handle one
bank's layout well. The plan for this tool is to keep everything client-side (nothing about a
statement's contents ever leaves the browser) and to cover the highest-volume US bank
statement formats directly, with a generic fallback parser for anything else - plus a
mandatory review step before any file is exported, since a silently wrong row in someone's
books is a real cost, not just an inconvenience.

## What works today

- Drop in a digital (text-layer) bank statement PDF.
- Six bank-specific parsers - Chase, Bank of America, Wells Fargo, U.S. Bank, PNC, and Ally -
  each recognizing that bank's own statement layout directly. Bank of America and Ally have
  each been checked against a real statement from that bank; the other four have not yet, so
  their output is worth extra care until a real specimen surfaces to verify against.
- A generic fallback parser for anything the per-bank parsers don't recognize: it looks for
  lines shaped like `date  description  amount` (and `date  description  amount 
  running-balance`, and `description  date  amount  running-balance`) - the layout most other
  US bank/card statements share.
- Every parsed row is shown in an editable review table before anything can be exported - you
  can fix or remove any row, see a live-updating total (net, deposits, withdrawals) to sanity-
  check against the statement's own printed totals, and export stays disabled until you confirm
  you've checked the results against your original statement.
- Export to CSV, QBO (QuickBooks), or Xero's own CSV import format.

## What doesn't work yet

- Only 6 of the highest-volume US banks have a dedicated parser so far; everything else falls
  back to the generic parser, which will miss anything that doesn't fit its own
  date/description/amount heuristic.
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
