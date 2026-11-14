import { describe, it, expect } from 'vitest';
import { validateUrl, SecurityError } from '../../../src/core/http.js';

describe('Safe HTTP Client (src/core/http.ts)', () => {
  it('allows registry.npmjs.org and api.osv.dev over HTTPS', () => {
    const url1 = validateUrl('https://registry.npmjs.org/express');
    expect(url1.hostname).toBe('registry.npmjs.org');

    const url2 = validateUrl('https://api.osv.dev/v1/query');
    expect(url2.hostname).toBe('api.osv.dev');
  });

  it('rejects non-HTTPS URLs', () => {
    expect(() => validateUrl('http://registry.npmjs.org/express')).toThrow(SecurityError);
    expect(() => validateUrl('http://registry.npmjs.org/express')).toThrow(/requires HTTPS/);
  });

  it('rejects non-allowlisted hosts immediately', () => {
    expect(() => validateUrl('https://evil.attacker.com/malicious')).toThrow(SecurityError);
    expect(() => validateUrl('https://evil.attacker.com/malicious')).toThrow(/not in the allowlist/);
  });

  it('rejects local/loopback endpoints to prevent SSRF', () => {
    expect(() => validateUrl('https://localhost:8080/admin')).toThrow(SecurityError);
    expect(() => validateUrl('https://127.0.0.1/secrets')).toThrow(SecurityError);
    expect(() => validateUrl('https://169.254.169.254/latest/meta-data/')).toThrow(SecurityError);
  });
});
