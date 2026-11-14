/**
 * npm Registry Client with safeFetch and disk caching.
 * Enforces rules in docs/ARCHITECTURE.md and docs/SECURITY.md.
 */

import { safeFetch } from '../core/http.js';
import { defaultCache } from '../core/cache.js';
import { sanitize } from '../core/sanitize.js';

export interface PackageVersionMetadata {
  name: string;
  version: string;
  description?: string;
  deprecated?: string | boolean;
  main?: string;
  types?: string;
  typings?: string;
  exports?: unknown;
  typesVersions?: unknown;
  dist: {
    tarball: string;
    shasum?: string;
    integrity?: string;
  };
  repository?: {
    type?: string;
    url?: string;
  } | string;
}

export interface PackageMetadata {
  name: string;
  'dist-tags': Record<string, string>;
  versions: Record<string, PackageVersionMetadata>;
  time?: Record<string, string>;
  repository?: {
    type?: string;
    url?: string;
  } | string;
}

const REGISTRY_TTL_MS = 60 * 60 * 1000; // 1 hour TTL for registry metadata

/**
 * Fetches package metadata from npm registry with cache and error handling.
 */
export async function fetchPackageMetadata(packageName: string): Promise<{
  metadata: PackageMetadata | null;
  status: 'found' | 'not_found' | 'error';
  error?: string;
  cache: 'hit' | 'miss' | 'stale';
}> {
  const normalized = packageName.trim();
  const cacheKey = `npm:pkg:${normalized}`;

  // Check disk cache first
  const cached = defaultCache.get<PackageMetadata>(cacheKey);
  if (cached && !cached.isStale) {
    return {
      metadata: cached.data,
      status: 'found',
      cache: 'hit',
    };
  }

  // Construct registry URL safely
  // Encodes scoped packages like @types/node -> @types%2Fnode
  const encodedName = normalized.startsWith('@')
    ? `@${encodeURIComponent(normalized.slice(1))}`
    : encodeURIComponent(normalized);

  const registryUrl = `https://registry.npmjs.org/${encodedName}`;

  try {
    const response = await safeFetch(registryUrl);

    if (response.status === 404) {
      return {
        metadata: null,
        status: 'not_found',
        cache: 'miss',
      };
    }

    if (!response.ok) {
      // If we have stale cache, fall back to it
      if (cached) {
        return {
          metadata: cached.data,
          status: 'found',
          cache: 'stale',
          error: `Registry returned status ${response.status}; using cached metadata`,
        };
      }
      return {
        metadata: null,
        status: 'error',
        error: `npm registry returned HTTP ${response.status}`,
        cache: 'miss',
      };
    }

    const data = (await response.json()) as PackageMetadata;

    // Cache the fresh metadata
    defaultCache.set(cacheKey, data, REGISTRY_TTL_MS);

    return {
      metadata: data,
      status: 'found',
      cache: cached ? 'stale' : 'miss',
    };
  } catch (err: unknown) {
    // Offline or network error: return stale cache if available
    if (cached) {
      return {
        metadata: cached.data,
        status: 'found',
        cache: 'stale',
        error: err instanceof Error ? err.message : String(err),
      };
    }

    return {
      metadata: null,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
      cache: 'miss',
    };
  }
}

/**
 * Checks whether a separate @types/<pkg> package exists on npm.
 */
export async function checkDefinitelyTyped(packageName: string): Promise<boolean> {
  if (packageName.startsWith('@types/')) return true;

  const dtName = packageName.startsWith('@')
    ? `@types/${packageName.slice(1).replace('/', '__')}`
    : `@types/${packageName}`;

  const { status } = await fetchPackageMetadata(dtName);
  return status === 'found';
}
