import { describe, it, expect } from 'vitest';
import { createResult, createUnverifiable, createInvalidInput } from '../../../src/core/result.js';

describe('Result Envelope (src/core/result.ts)', () => {
  it('creates standard groundwork/1 envelope with verified verdict', () => {
    const res = createResult({
      tool: 'verify_symbol',
      verdict: 'verified',
      confidence: 'high',
      data: { name: 'safeFetch' },
      evidence: [
        {
          type: 'declaration',
          ref: 'dist/core/http.d.ts',
          detail: 'Exported function safeFetch found',
        },
      ],
    });

    expect(res.schema).toBe('groundwork/1');
    expect(res.tool).toBe('verify_symbol');
    expect(res.verdict).toBe('verified');
    expect(res.confidence).toBe('high');
    expect(res.data).toEqual({ name: 'safeFetch' });
    expect(res.evidence.length).toBe(1);
    expect(res.checkedAt).toBeDefined();
    expect(res.warnings).toEqual([]);
  });

  it('throws an error if unverifiable is returned without a reason', () => {
    expect(() => {
      createResult({
        tool: 'verify_package',
        verdict: 'unverifiable',
        data: {},
      });
    }).toThrow(/requires an explicit reason code/);
  });

  it('creates unverifiable envelope with shortcut helper', () => {
    const res = createUnverifiable('verify_package', 'network', 'Failed to reach npm registry');
    expect(res.verdict).toBe('unverifiable');
    expect(res.reason).toBe('network');
    expect(res.warnings).toContain('Failed to reach npm registry');
    expect(res.confidence).toBe('low');
  });

  it('creates invalid_input envelope with shortcut helper', () => {
    const res = createInvalidInput('verify_installed', 'Path cannot reference .env files');
    expect(res.verdict).toBe('unverifiable');
    expect(res.reason).toBe('invalid_input');
    expect(res.warnings).toContain('Path cannot reference .env files');
  });
});
