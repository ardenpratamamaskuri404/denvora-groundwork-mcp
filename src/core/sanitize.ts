import { LIMITS } from './limits.js';

/**
 * Common regex patterns for credentials, tokens, and private keys.
 */
const SECRET_PATTERNS = [
  // OpenAI, Anthropic, Gemini, Stripe keys
  /(?:sk|pk|rk)[_-](?:live|test|proj|ant)?[a-zA-Z0-9_\-]{20,}/g,
  // GitHub Personal Access Tokens (classic & fine-grained)
  /gh[pousr]_[a-zA-Z0-9]{36,}/g,
  // AWS Access Key ID
  /(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}/g,
  // Bearer tokens in headers or text
  /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi,
  // Generic password/api-key assignments
  /(?:password|api_key|apikey|secret|token|auth_token)\s*[:=]\s*["']?([^\s"';&]+)["']?/gi,
  // Private Key blocks
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

/**
 * Redacts known secret patterns from text, replacing them with [REDACTED_SECRET].
 */
export function redactSecrets(text: string): string {
  if (!text) return text;
  let result = text;

  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, (match) => {
      // If it's a key-value assignment like password="xyz", keep the key name and redact the value
      if (match.toLowerCase().includes('password') || match.toLowerCase().includes('key') || match.toLowerCase().includes('secret') || match.toLowerCase().includes('token')) {
        const parts = match.split(/[:=]/);
        if (parts.length >= 2 && parts[0]) {
          return `${parts[0]}=[REDACTED_SECRET]`;
        }
      }
      return '[REDACTED_SECRET]';
    });
  }

  return result;
}

/**
 * Strips dangerous invisible characters:
 * - Null bytes (\0)
 * - Control characters (0x00 - 0x1F except \n, \r, \t)
 * - Directional override / bidi characters (U+202A to U+202E, U+2066 to U+2069)
 * - Zero-width characters (U+200B to U+200D, U+FEFF)
 */
export function stripDangerousCharacters(text: string): string {
  if (!text) return text;

  return text
    // Replace null bytes
    .replace(/\0/g, '')
    // Remove bidi overrides and zero-width characters
    .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E\u2066-\u2069]/g, '')
    // Remove non-standard control characters (keep \t, \n, \r)
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Truncates text cleanly to a maximum length, appending '...' if truncated.
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  if (maxLength <= 3) return text.slice(0, maxLength);
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Complete sanitization pipeline:
 * 1. Redacts credentials
 * 2. Strips bidi and invisible control characters
 * 3. Truncates to max allowed length
 */
export function sanitize(text: string, maxLength: number = LIMITS.MAX_MESSAGE_CHARS): string {
  if (typeof text !== 'string') return '';
  const redacted = redactSecrets(text);
  const stripped = stripDangerousCharacters(redacted);
  return truncate(stripped.trim(), maxLength);
}

/**
 * Strip comments from TypeScript declaration signatures (JSDoc, block and line comments).
 */
export function stripCommentsFromSignature(signature: string): string {
  if (!signature) return '';
  return signature
    // Remove multi-line and JSDoc comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove single-line comments
    .replace(/\/\/.*$/gm, '')
    // Normalize extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}
