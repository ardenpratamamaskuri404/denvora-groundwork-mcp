/**
 * Security thresholds, limits, and blacklists.
 * Harmonized with docs/SECURITY.md and denvora-ai-skills references/tool-orchestration.md.
 */

export const ALLOWLISTED_HOSTS = new Set([
  'registry.npmjs.org',
  'api.osv.dev',
]);

export const LIMITS = {
  HTTP_TIMEOUT_MS: 8_000,
  TOOL_EXECUTION_BUDGET_MS: 15_000,
  MAX_COMPRESSED_TARBALL_BYTES: 15 * 1024 * 1024, // 15 MB
  MAX_EXTRACTED_BYTES: 50 * 1024 * 1024,          // 50 MB
  MAX_DECLARATION_FILES: 500,
  MAX_SINGLE_DECLARATION_BYTES: 3 * 1024 * 1024,  // 3 MB

  MAX_MESSAGE_CHARS: 500,
  MAX_SIGNATURE_CHARS: 1_000,
  MAX_ADVISORY_SUMMARY_CHARS: 500,
  MAX_WARNING_CHARS: 300,
} as const;

/**
 * Secret & Privacy Shield Blacklist patterns.
 * Tools strictly refuse to read or process files matching these names or extensions.
 */
export const SECRET_FILE_PATTERNS = [
  /^\.env(\..+)?$/i,
  /^credentials(\..+)?$/i,
  /^client_secrets.*\.json$/i,
  /^service-account.*\.json$/i,
  /^\.?git-credentials$/i,
  /^\.?npmrc$/i,
  /^\.?netrc$/i,
  /^id_[a-zA-Z0-9_-]+$/i,
  /\.pem$/i,
  /\.key$/i,
  /\.keystore$/i,
  /\.pfx$/i,
  /\.p12$/i,
  /\.secret$/i,
  /\.token$/i,
  /^\.aws$/i,
  /^\.ssh$/i,
  /^\.gnupg$/i,
];

/**
 * Checks if a filename or path targets a blacklisted credential/secret file.
 */
export function isBlacklistedSecretFile(filePath: string): boolean {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();

  // Check any segment of the path against blacklist
  const segments = normalized.split('/').filter(Boolean);
  for (const seg of segments) {
    if (SECRET_FILE_PATTERNS.some((pattern) => pattern.test(seg))) {
      return true;
    }
  }

  // Check full path for dangerous directory references
  if (
    normalized.includes('/.ssh/') ||
    normalized.includes('/.aws/') ||
    normalized.includes('/.gnupg/') ||
    normalized.endsWith('/.ssh') ||
    normalized.endsWith('/.aws') ||
    normalized.endsWith('/.gnupg')
  ) {
    return true;
  }

  return false;
}

/**
 * Validates npm package name format (prevents directory traversal attacks like ../../.env).
 */
