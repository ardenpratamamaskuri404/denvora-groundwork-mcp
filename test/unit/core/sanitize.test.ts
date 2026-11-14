import { describe, it, expect } from 'vitest';
import {
  sanitize,
  redactSecrets,
  stripDangerousCharacters,
  truncate,
  stripCommentsFromSignature,
} from '../../../src/core/sanitize.js';

describe('Sanitization & Security Shield (src/core/sanitize.ts)', () => {
  it('redacts common secret patterns (sk-..., GitHub tokens, AWS keys, passwords)', () => {
    const mockSk = ['sk', '-test-', 'dummyfakekey1234567890abcdef'].join('');
    const mockGhp = ['gh', 'p_', 'dummyfaketoken1234567890abcdef123456'].join('');
    const raw = `Config with apiKey: ${mockSk} and token=${mockGhp}`;
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain(mockSk);
    expect(redacted).not.toContain(mockGhp);
    expect(redacted).toContain('[REDACTED_SECRET]');
  });

  it('redacts private keys completely', () => {
    const key = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y...
-----END RSA PRIVATE KEY-----`;
    const redacted = redactSecrets(key);
    expect(redacted).toBe('[REDACTED_SECRET]');
  });

  it('strips null bytes, directional overrides, and zero-width characters', () => {
    // \u202E is Right-to-Left Override, \u200B is zero-width space, \0 is null byte
    const malicious = 'SafeText\0With\u200BHidden\u202EOverride';
    const clean = stripDangerousCharacters(malicious);
    expect(clean).toBe('SafeTextWithHiddenOverride');
  });

  it('truncates strings cleanly with ellipsis', () => {
    const long = 'abcdefghijklmnopqrstuvwxyz';
    expect(truncate(long, 10)).toBe('abcdefg...');
    expect(truncate(long, 30)).toBe(long);
    expect(truncate(long, 2)).toBe('ab');
  });

  it('strips comments from TypeScript signatures', () => {
    const signature = `
      /**
       * Calculates something
       * @param x input number
       */
      function calculate(x: number /* the value */): number; // inline comment
    `;
    const clean = stripCommentsFromSignature(signature);
    expect(clean).toBe('function calculate(x: number ): number;');
  });

  it('sanitizes text end-to-end with length limit and secret redaction', () => {
    const input = 'Error encountered with password="SuperSecret123" at step 1\u200B';
    const result = sanitize(input, 60);
    expect(result).not.toContain('SuperSecret123');
    expect(result).toContain('[REDACTED_SECRET]');
    expect(result.length).toBeLessThanOrEqual(60);
  });
});
