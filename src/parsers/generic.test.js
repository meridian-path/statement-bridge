import { describe, it, expect } from 'vitest';
import { parseGenericStatement } from './generic.js';

describe('parseGenericStatement', () => {
  it('parses a simple date/description/amount line', () => {
    const { transactions } = parseGenericStatement('01/15 AMAZON.COM PURCHASE -42.99');
    expect(transactions).toEqual([
      { date: '01/15', description: 'AMAZON.COM PURCHASE', amount: -42.99 },
    ]);
  });

  it('treats the last of two trailing amounts as a running balance, not the transaction amount', () => {
    const { transactions } = parseGenericStatement('01/16/2026 STARBUCKS #1234 -5.75 1,234.56');
    expect(transactions).toEqual([
      { date: '01/16/2026', description: 'STARBUCKS #1234', amount: -5.75 },
    ]);
  });

  it('treats a parenthesized amount as negative', () => {
    const { transactions } = parseGenericStatement('02/01 SERVICE FEE ($12.00)');
    expect(transactions[0].amount).toBe(-12);
  });

  it('strips a leading dollar sign and thousands separator', () => {
    const { transactions } = parseGenericStatement('03/01 PAYROLL DEPOSIT $1,500.00');
    expect(transactions[0].amount).toBe(1500);
  });

  it('skips lines with no leading date, e.g. headers and footers', () => {
    const { transactions } = parseGenericStatement(
      'Statement Period: Jan 1 - Jan 31\nDate Description Amount'
    );
    expect(transactions).toEqual([]);
  });

  it('reports a dated line with no parseable amount as skipped, not silently dropped', () => {
    const { transactions, skipped } = parseGenericStatement('04/01 ONLINE TRANSFER PENDING');
    expect(transactions).toEqual([]);
    expect(skipped).toEqual(['04/01 ONLINE TRANSFER PENDING']);
  });

  it('parses multiple transaction lines in order', () => {
    const { transactions } = parseGenericStatement(
      ['01/02 GROCERY STORE -63.10', '01/03 PAYROLL DEPOSIT 1200.00'].join('\n')
    );
    expect(transactions).toHaveLength(2);
    expect(transactions[0].description).toBe('GROCERY STORE');
    expect(transactions[1].amount).toBe(1200);
  });

  // Real text extracted (via the app's own extractTextFromPdf + pdf.js pipeline, not
  // hand-typed) from sample-statements-inbox/capitalone-sample-PARTIAL-credit-only.pdf -
  // Capital One's own official sample eStatement. This statement's activity rows print
  // DESCRIPTION before DATE ("Monthly Interest Paid 01/31/2013 $2.49 $1,189.42"), the opposite
  // order from every other fixture in this file - real-world proof this shape exists, not a
  // hypothetical. Real customer data: none: it's a bank-published template (a diagonal SAMPLE
  // watermark, placeholder name "Savvy Saver", placeholder address, placeholder account number
  // all appear on the actual PDF).
  const CAPITAL_ONE_REAL_EXTRACTED_TEXT =
    'Savvy Saver\n360 Market St. Thanks for saving with Capital One 360\nAnywhere, US 12345\n' +
    'Since you became a Saver on 12/18/2006,\nyour account(s) have earned:\n$194.17\n' +
    'Customer Number 46587699\nYour Savings Summary as of 03/31/2013\n' +
    'Account Type Nickname Account Number Account Balance Joint Name\n' +
    '360 Savings 12345678 $1,194.17 Savvy Saver\nYour 360 Savings Activity\n' +
    'Account: 12345678 Current Interest Rate: 2.467% Annual Percentage Yield Earned: 2.49% ' +
    'Interest Life To Date: $194.17\nYear to date Interest: $7.24\n' +
    'Activity Date Amount Balance\nOpening Balance 01/01/2013 $1,186.93\n' +
    'Monthly Interest Paid 01/31/2013 $2.49 $1,189.42\n' +
    'Monthly Interest Paid 02/28/2013 $2.25 $1,191.67\n' +
    'Monthly Interest Paid 03/31/2013 $2.50 $1,194.17\nClosing Balance 03/31/2013 $1,194.17\n' +
    'Your email address is: saver@capitalone360.com . Update this and all your information at ' +
    'capitalone360.com in the My Info section.\ncapitalone360.com Interactive Phone Service: ' +
    '1-888-464-7868 P.O. Box 60\nComments: sales@capitalone360.com Sales/Service Number: ' +
    '1-888-464-0727 St. Cloud, MN 56302';

  it('parses a real description-before-date statement (Capital One official sample), reconciling to its own stated totals', () => {
    const { transactions, skipped } = parseGenericStatement(CAPITAL_ONE_REAL_EXTRACTED_TEXT);

    expect(transactions).toEqual([
      { date: '01/31/2013', description: 'Monthly Interest Paid', amount: 2.49 },
      { date: '02/28/2013', description: 'Monthly Interest Paid', amount: 2.25 },
      { date: '03/31/2013', description: 'Monthly Interest Paid', amount: 2.5 },
    ]);

    // Matches the statement's own stated "Year to date Interest: $7.24" and its own
    // Opening Balance ($1,186.93) -> Closing Balance ($1,194.17) delta ($7.24) exactly.
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(7.24);

    // Opening Balance and Closing Balance share the exact same description-then-date shape as
    // the real transactions above, but only carry a single trailing amount (no separate
    // transaction-amount-plus-balance pair) - surfaced as skipped, not counted as transactions
    // and not silently dropped either.
    expect(skipped).toEqual([
      'Opening Balance 01/01/2013 $1,186.93',
      'Closing Balance 03/31/2013 $1,194.17',
    ]);
  });
});
