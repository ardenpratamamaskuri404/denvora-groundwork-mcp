/**
 * Public result envelope and verdict types (groundwork/1).
 * Harmonized with docs/TOOLS.md and docs/ARCHITECTURE.md.
 */

import { sanitize } from './sanitize.js';

export type Verdict = 'verified' | 'not_found' | 'unverifiable';
export type Confidence = 'high' | 'medium' | 'low';
export type CacheStatus = 'hit' | 'miss' | 'stale';

export type EvidenceType =
  | 'registry'
  | 'tarball'
  | 'declaration'
  | 'advisory-db'
  | 'project-file';

export interface Evidence {
  type: EvidenceType;
  ref: string;
  detail: string;
}

export type ReasonCode =
  | 'no_types'
  | 'untyped_exports'
  | 'analysis_incomplete'
  | 'size_limit'
  | 'timeout'
  | 'network'
  | 'not_installed'
  | 'unsupported_ecosystem'
  | 'invalid_input'
  | 'rate_limited';

export interface ResultEnvelope<T> {
  schema: 'groundwork/1';
  tool: string;
  verdict: Verdict;
  confidence: Confidence;
  data: T;
  evidence: Evidence[];
  reason?: ReasonCode | string;
  warnings: string[];
  checkedAt: string;
  cache: CacheStatus;
}

export interface CreateResultOptions<T> {
  tool: string;
  verdict: Verdict;
  data: T;
  evidence?: Evidence[];
  reason?: ReasonCode | string;
  warnings?: string[];
  confidence?: Confidence;
  cache?: CacheStatus;
}

/**
 * Creates a standard Groundwork result envelope adhering to groundwork/1 specification.
 */
export function createResult<T>(options: CreateResultOptions<T>): ResultEnvelope<T> {
  const {
    tool,
    verdict,
    data,
    evidence = [],
    reason,
    warnings = [],
    confidence = verdict === 'verified' ? 'high' : verdict === 'not_found' ? 'medium' : 'low',
    cache = 'miss',
  } = options;

  // Enforce rule: 'unverifiable' requires a reason code
  if (verdict === 'unverifiable' && !reason) {
    throw new Error(`Verdict 'unverifiable' requires an explicit reason code in tool '${tool}'.`);
  }

  // Sanitize warnings
  const sanitizedWarnings = warnings.map((w) => sanitize(w, 300));

  return {
    schema: 'groundwork/1',
    tool,
    verdict,
    confidence,
    data,
    evidence,
    ...(reason ? { reason: sanitize(reason, 200) } : {}),
    warnings: sanitizedWarnings,
    checkedAt: new Date().toISOString(),
    cache,
  };
}

/**
 * Shortcut for creating an honest 'unverifiable' envelope.
 */
export function createUnverifiable<T = Record<string, unknown>>(
  tool: string,
  reason: ReasonCode | string,
  message?: string,
  data?: T
): ResultEnvelope<T> {
  return createResult<T>({
    tool,
    verdict: 'unverifiable',
    confidence: 'low',
    data: (data ?? {}) as T,
    reason,
    warnings: message ? [message] : [],
  });
}

/**
 * Shortcut for creating an 'invalid_input' error envelope.
 */
export function createInvalidInput(tool: string, message: string): ResultEnvelope<Record<string, never>> {
  return createResult<Record<string, never>>({
    tool,
    verdict: 'unverifiable',
    confidence: 'low',
    data: {},
    reason: 'invalid_input',
    warnings: [message],
  });
}
