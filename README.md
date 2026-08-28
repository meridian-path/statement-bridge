# Statement Bridge

A planned tool for converting bank statement PDFs into CSV, QBO, and Xero-ready files for
bookkeeping - entirely in the browser, no upload, no account.

**Status: scaffold only. No parsing logic exists yet.** This repository holds the initial
project skeleton; the actual statement-to-CSV/QBO/Xero conversion has not been built.

## The plan

Most free statement-to-CSV converters either upload your PDF to a server or only handle one
bank's layout well. The plan for this tool is to keep everything client-side (nothing about a
statement's contents ever leaves the browser) and to cover the highest-volume US bank
statement formats directly, with a generic fallback parser for anything else - plus a
mandatory review step before any file is exported, since a silently wrong row in someone's
books is a real cost, not just an inconvenience.

None of that is built yet. This repo currently contains only a minimal project skeleton.

## Development

```
npm install
```

No build, test, or serve scripts exist yet - they'll be added alongside the first real
feature work.

## What this deliberately does not do, yet

No accounts, no server-side component, no payment, and nothing deployed. This is a fresh
scaffold, not a shipped or live product.
