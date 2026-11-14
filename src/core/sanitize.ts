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
