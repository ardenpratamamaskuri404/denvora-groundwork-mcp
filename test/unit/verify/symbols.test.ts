import { describe, it, expect } from 'vitest';
import { handleVerifySymbol } from '../../../src/tools/verify-symbol.js';

describe('verify_symbol & AST Declaration Analysis (Phase 2)', () => {
  it('verifies a real symbol in a typed package (zod -> z)', async () => {
    const res = await handleVerifySymbol({
      package: 'zod',
      symbol: 'z',
      version: 'latest',
    });

    expect(res.schema).toBe('groundwork/1');
    expect(res.tool).toBe('verify_symbol');
    expect(res.verdict).toBe('verified');
    expect(res.data.found).toBe(true);
    expect(res.data.symbol).toBe('z');
    expect(res.data.allExportsCount).toBeGreaterThan(0);
    expect(res.evidence.length).toBeGreaterThan(0);
  }, 15000);

  it('returns not_found when symbol does not exist in real package declarations', async () => {
    const res = await handleVerifySymbol({
      package: 'zod',
      symbol: 'nonExistentHallucinatedFunction12345',
      version: 'latest',
    });

    expect(res.verdict).toBe('not_found');
    expect(res.data.found).toBe(false);
    expect(res.evidence[0]?.detail).toContain('Exhaustive declaration analysis completed');
    // available exports count should be greater than 0
    expect(res.data.allExportsCount).toBeGreaterThan(0);
  }, 15000);

  it('rejects missing package or symbol with invalid_input', async () => {
    const res = await handleVerifySymbol({ package: '', symbol: '' });
    expect(res.verdict).toBe('unverifiable');
    expect(res.reason).toBe('invalid_input');
  });
});
