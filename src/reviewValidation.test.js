import { describe, it, expect } from 'vitest';
import { validateAmount } from './reviewValidation.js';

describe('validateAmount', () => {
  it('accepts a plain integer', () => {
    expect(validateAmount('42')).toBe(true);
  });

  it('accepts a negative decimal', () => {
    expect(validateAmount('-42.99')).toBe(true);
  });

  it('accepts a positive decimal', () => {
    expect(validateAmount('1850.00')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(validateAmount('')).toBe(false);
  });

  it('rejects whitespace-only', () => {
    expect(validateAmount('   ')).toBe(false);
  });

  it('rejects trailing garbage that parseFloat would silently accept as 12', () => {
    expect(validateAmount('12abc')).toBe(false);
  });

  it('rejects leading garbage', () => {
    expect(validateAmount('abc12')).toBe(false);
  });

  it('rejects a bare decimal point', () => {
    expect(validateAmount('.')).toBe(false);
  });

  it('rejects a bare minus sign', () => {
    expect(validateAmount('-')).toBe(false);
  });

  it('tolerates surrounding whitespace on an otherwise valid number', () => {
    expect(validateAmount('  42.10  ')).toBe(true);
  });
});
