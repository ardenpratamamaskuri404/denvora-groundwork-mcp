/**
 * Safe HTTP client with strict host allowlisting and timeouts.
 * Enforces security invariants in docs/SECURITY.md.
 */

import { ALLOWLISTED_HOSTS, LIMITS } from './limits.js';

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
  maxBytes?: number;
}

/**
 * Validates whether a target URL is strictly allowlisted.
 */
export function validateUrl(targetUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new SecurityError(`Invalid URL provided: ${targetUrl}`);
  }

  if (parsed.protocol !== 'https:') {
    throw new SecurityError(`Insecure protocol '${parsed.protocol}'. Groundwork requires HTTPS.`);
  }

  if (!ALLOWLISTED_HOSTS.has(parsed.hostname)) {
    throw new SecurityError(
      `Host '${parsed.hostname}' is not in the allowlist. Only official registries are permitted.`
    );
  }

  return parsed;
}

/**
 * Safe fetch implementation with allowlist check, timeout, and response size guards.
 */
export async function safeFetch(targetUrl: string, options: SafeFetchOptions = {}): Promise<Response> {
  const parsed = validateUrl(targetUrl);
  const timeoutMs = options.timeoutMs ?? LIMITS.HTTP_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new TimeoutError(`Request to ${parsed.hostname} timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    const headers = new Headers(options.headers);
    if (!headers.has('User-Agent')) {
      headers.set('User-Agent', 'denvora-groundwork/0.1.0 (+https://github.com/ardenpratamamaskuri404/denvora-mcp)');
    }

    const response = await fetch(parsed.toString(), {
      ...options,
      headers,
      signal: controller.signal,
      redirect: 'manual', // Manually inspect redirects to ensure target host remains allowlisted
    });

    // Check redirects
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new SecurityError('Redirect response without location header.');
      }
      const redirectUrl = new URL(location, parsed.origin);
      if (!ALLOWLISTED_HOSTS.has(redirectUrl.hostname)) {
        throw new SecurityError(`Blocked redirect to non-allowlisted host: ${redirectUrl.hostname}`);
      }
      // Follow one redirect safely
      return safeFetch(redirectUrl.toString(), { ...options, timeoutMs });
    }

    // Check Content-Length if available
    const contentLength = response.headers.get('content-length');
    if (contentLength && options.maxBytes) {
      const bytes = parseInt(contentLength, 10);
      if (!isNaN(bytes) && bytes > options.maxBytes) {
        throw new SecurityError(`Response content length (${bytes} bytes) exceeds limit (${options.maxBytes} bytes).`);
      }
    }

    return response;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new TimeoutError(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
