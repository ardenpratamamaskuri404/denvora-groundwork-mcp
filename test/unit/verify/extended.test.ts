import { describe, it, expect } from 'vitest';
import { handleSuggestSymbol } from '../../../src/tools/suggest-symbol.js';
import { handleScanVulnerabilities } from '../../../src/tools/scan-vulnerabilities.js';
import { handleVerifyInstalled } from '../../../src/tools/verify-installed.js';

describe('Verify Module Extended: suggest, scan, installed (Phase 3)', () => {
  it('suggest_symbol recommends real exports for misremembered names (zod -> z)', async () => {
    const res = await handleSuggestSymbol({
      package: 'zod',
      query: 'Z',
      version: 'latest',
      limit: 5,
    });

    expect(res.schema).toBe('groundwork/1');
    expect(res.tool).toBe('suggest_symbol');
    expect(res.verdict).toBe('verified');
    expect(res.data.suggestions.length).toBeGreaterThan(0);
  }, 15000);

  it('scan_vulnerabilities queries OSV for known package versions', async () => {
    // Lodash 4.17.4 has known CVEs (prototype pollution)
    const res = await handleScanVulnerabilities({
      package: 'lodash',
      version: '4.17.4',
    });

    expect(res.schema).toBe('groundwork/1');
    expect(res.tool).toBe('scan_vulnerabilities');
    expect(res.verdict).toBe('verified');
    expect(res.data.hasVulnerabilities).toBe(true);
    expect(res.data.advisories.length).toBeGreaterThan(0);
    expect(res.data.advisories[0]?.id).toBeDefined();
  }, 10000);

  it('scan_vulnerabilities returns 0 advisories for clean patched versions', async () => {
    // Chalk 5.3.0 has 0 reported vulnerabilities
    const res = await handleScanVulnerabilities({
      package: 'chalk',
      version: '5.3.0',
    });

    expect(res.verdict).toBe('verified');
    expect(res.data.hasVulnerabilities).toBe(false);
    expect(res.data.advisories.length).toBe(0);
  });

  it('verify_installed verifies local project dependencies (zod in node_modules)', async () => {
    const res = await handleVerifyInstalled({
      package: 'zod',
      symbol: 'z',
    });

    expect(res.schema).toBe('groundwork/1');
    expect(res.tool).toBe('verify_installed');
    expect(res.verdict).toBe('verified');
    expect(res.data.isInstalled).toBe(true);
    expect(res.data.symbolFound).toBe(true);
    expect(res.evidence[0]?.detail).toContain('verified in local node_modules');
  });

  it('verify_installed rejects queries targeting .env or secret files with invalid_input', async () => {
    const res = await handleVerifyInstalled({
      package: '.env',
    });

    expect(res.verdict).toBe('unverifiable');
    expect(res.reason).toBe('invalid_input');
    expect(res.warnings[0]).toContain('blacklisted credential or secret file');
  });

  it('verify_installed strictly rejects path traversal attempts (e.g. ../../some_package)', async () => {
    const res = await handleVerifyInstalled({
      package: '../../some_package',
    });

    expect(res.verdict).toBe('unverifiable');
    expect(res.reason).toBe('invalid_input');
    expect(res.warnings[0]).toContain('Invalid package name');
  });

  it('verify_installed returns not_installed for missing package', async () => {
    const res = await handleVerifyInstalled({
      package: 'definitely-not-installed-pkg-xyz-987',
    });

    expect(res.verdict).toBe('unverifiable');
    expect(res.reason).toBe('not_installed');
  });
});
