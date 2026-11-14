import { describe, it, expect } from 'vitest';
import { handleVerifyPackage } from '../../../src/tools/verify-package.js';
import { checkTyposquat } from '../../../src/verify/typosquat.js';

describe('verify_package & Typosquatting (Phase 1)', () => {
  it('flags lookalike package names', () => {
    // "expres" is edit distance 1 from "express"
    const result1 = checkTyposquat('expres');
    expect(result1.flag).toBe(true);
    expect(result1.similarTo).toContain('express');

    // "reactdom" (missing hyphen) vs "react-dom"
    const result2 = checkTyposquat('reactdom');
    expect(result2.flag).toBe(true);
    expect(result2.similarTo).toContain('react-dom');

    // Exact popular package is not flagged as a typosquat of itself
    const result3 = checkTyposquat('express');
    expect(result3.flag).toBe(false);
  });

  it('rejects empty package name with invalid_input', async () => {
    const res = await handleVerifyPackage({ name: '' });
    expect(res.verdict).toBe('unverifiable');
    expect(res.reason).toBe('invalid_input');
  });

  it('verifies a real popular package against live npm registry', async () => {
    const res = await handleVerifyPackage({ name: 'zod', version: 'latest' });
    expect(res.schema).toBe('groundwork/1');
    expect(res.tool).toBe('verify_package');
    expect(res.verdict).toBe('verified');
    expect(res.data.name).toBe('zod');
    expect(res.data.exists).toBe(true);
    expect(res.data.versionExists).toBe(true);
    expect(res.data.typesStatus).toBe('bundled');
    expect(res.evidence.length).toBeGreaterThan(0);
  });

  it('returns not_found for definitely nonexistent package name', async () => {
    const res = await handleVerifyPackage({
      name: 'denvora-definitely-nonexistent-package-xyz-987654321',
    });
    expect(res.verdict).toBe('not_found');
    expect(res.data.exists).toBe(false);
    expect(res.evidence[0]?.detail).toContain('404');
  });
});
