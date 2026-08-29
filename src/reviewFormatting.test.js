import { describe, it, expect } from 'vitest';
import { formatCurrencyDisplay, computeTotals, buildFieldLabel, buildRemoveLabel } from './reviewFormatting.js';

describe('formatCurrencyDisplay', () => {
  it('formats a positive amount with a leading dollar sign and two decimals', () => {
    expect(formatCurrencyDisplay(1850)).toBe('$1,850.00');
  });

  it('formats a negative amount with a leading minus and dollar sign', () => {
    expect(formatCurrencyDisplay(-84.32)).toBe('-$84.32');
  });

  it('adds thousands separators', () => {
    expect(formatCurrencyDisplay(1234567.89)).toBe('$1,234,567.89');
  });

  it('pads a whole-cent amount to two decimals', () => {
    expect(formatCurrencyDisplay(5)).toBe('$5.00');
  });

  it('formats zero as a plain positive amount, not negative zero', () => {
    expect(formatCurrencyDisplay(0)).toBe('$0.00');
  });

  it('formats a small negative amount without a stray negative zero', () => {
    expect(formatCurrencyDisplay(-0.004)).toBe('$0.00');
  });
});

describe('computeTotals', () => {
  it('sums deposits and withdrawals separately, and nets them', () => {
    const totals = computeTotals([
      { amount: 1850 },
      { amount: -84.32 },
      { amount: -110.45 },
      { amount: 42.1 },
    ]);
    expect(totals).toEqual({
      count: 4,
      net: 1850 - 84.32 - 110.45 + 42.1,
      deposits: 1850 + 42.1,
      withdrawals: -84.32 - 110.45,
    });
  });

  it('returns zeroed totals for an empty list', () => {
    expect(computeTotals([])).toEqual({ count: 0, net: 0, deposits: 0, withdrawals: 0 });
  });

  it('treats a zero amount as a deposit, not a withdrawal', () => {
    const totals = computeTotals([{ amount: 0 }]);
    expect(totals.deposits).toBe(0);
    expect(totals.withdrawals).toBe(0);
    expect(totals.count).toBe(1);
  });
});

describe('buildFieldLabel', () => {
  it('names the field plus enough row identity to tell rows apart', () => {
    const tx = { date: '01/12/2023', description: 'Check Card Purchase', amount: -33.82 };
    expect(buildFieldLabel('Date', tx)).toBe('Date for Check Card Purchase on 01/12/2023');
    expect(buildFieldLabel('Description', tx)).toBe('Description for Check Card Purchase on 01/12/2023');
    expect(buildFieldLabel('Amount', tx)).toBe('Amount for Check Card Purchase on 01/12/2023');
  });

  it('does not read from any live-edited value beyond what is passed in - callers control staleness by which tx they pass', () => {
    const original = { date: '01/12/2023', description: 'Check Card Purchase', amount: -33.82 };
    const label = buildFieldLabel('Date', original);
    original.description = 'edited later';
    expect(label).toBe('Date for Check Card Purchase on 01/12/2023');
  });
});

describe('buildRemoveLabel', () => {
  it('uses a 1-based row number plus description and amount', () => {
    const tx = { date: '01/12/2023', description: 'Check Card Purchase', amount: -33.82 };
    expect(buildRemoveLabel(2, tx)).toBe('Remove row 3: Check Card Purchase, -33.82');
  });

  it('uses row 1 for index 0, not row 0', () => {
    const tx = { date: '01/02/2026', description: 'Direct Deposit', amount: 1850 };
    expect(buildRemoveLabel(0, tx)).toBe('Remove row 1: Direct Deposit, 1850');
  });
});
