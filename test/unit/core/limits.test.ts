import { describe, it, expect } from 'vitest';
import { isBlacklistedSecretFile, isValidPackageName, ALLOWLISTED_HOSTS } from '../../../src/core/limits.js';

describe('Limits and Blacklists (src/core/limits.ts)', () => {
  it('correctly identifies blacklisted secret files and sensitive directories', () => {
    expect(isBlacklistedSecretFile('.env')).toBe(true);
    expect(isBlacklistedSecretFile('.env.local')).toBe(true);
    expect(isBlacklistedSecretFile('.env.production')).toBe(true);
    expect(isBlacklistedSecretFile('credentials.json')).toBe(true);
    expect(isBlacklistedSecretFile('client_secrets.json')).toBe(true);
    expect(isBlacklistedSecretFile('service-account-key.json')).toBe(true);
    expect(isBlacklistedSecretFile('id_rsa')).toBe(true);
    expect(isBlacklistedSecretFile('id_ed25519')).toBe(true);
    expect(isBlacklistedSecretFile('.npmrc')).toBe(true);
    expect(isBlacklistedSecretFile('.git-credentials')).toBe(true);
    expect(isBlacklistedSecretFile('server.key')).toBe(true);
    expect(isBlacklistedSecretFile('cert.pem')).toBe(true);
    expect(isBlacklistedSecretFile('app.keystore')).toBe(true);
    expect(isBlacklistedSecretFile('/home/user/.ssh/id_rsa')).toBe(true);
    expect(isBlacklistedSecretFile('C:\\Users\\User\\.aws\\credentials')).toBe(true);
  });

  it('validates package names to prevent path traversal', () => {
    expect(isValidPackageName('zod')).toBe(true);
    expect(isValidPackageName('@types/node')).toBe(true);
    expect(isValidPackageName('express-rate-limit')).toBe(true);
    expect(isValidPackageName('../../.env')).toBe(false);
    expect(isValidPackageName('../package.json')).toBe(false);
    expect(isValidPackageName('foo/../bar')).toBe(false);
    expect(isValidPackageName('package\\with\\backslash')).toBe(false);
    expect(isValidPackageName('c:package')).toBe(false);
  });

  it('allows safe project files', () => {
    expect(isBlacklistedSecretFile('package.json')).toBe(false);
    expect(isBlacklistedSecretFile('tsconfig.json')).toBe(false);
    expect(isBlacklistedSecretFile('README.md')).toBe(false);
    expect(isBlacklistedSecretFile('src/index.ts')).toBe(false);
    expect(isBlacklistedSecretFile('env.example')).toBe(false);
  });

  it('contains only official trusted hosts in allowlist', () => {
    expect(ALLOWLISTED_HOSTS.has('registry.npmjs.org')).toBe(true);
    expect(ALLOWLISTED_HOSTS.has('api.osv.dev')).toBe(true);
    expect(ALLOWLISTED_HOSTS.has('evil.com')).toBe(false);
    expect(ALLOWLISTED_HOSTS.has('localhost')).toBe(false);
    expect(ALLOWLISTED_HOSTS.has('127.0.0.1')).toBe(false);
  });
});
