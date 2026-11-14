/**
 * verify_package tool handler.
 * Harmonized with docs/TOOLS.md.
 */

import { fetchPackageMetadata, checkDefinitelyTyped, PackageVersionMetadata } from '../verify/registry.js';
import { checkTyposquat } from '../verify/typosquat.js';
import { createResult, createUnverifiable, ResultEnvelope } from '../core/result.js';
import { sanitize } from '../core/sanitize.js';

export interface VerifyPackageInput {
  name: string;
  version?: string;
  ecosystem?: 'npm';
}

export interface VerifyPackageData {
  name: string;
  exists: boolean;
  requestedVersion: string;
  versionExists: boolean;
  latest: string;
  deprecated: {
    isDeprecated: boolean;
    message: string;
  };
  publishedAt: string;
  lastPublishedAt: string;
  repository: string | null;
  typesStatus: 'bundled' | 'definitelytyped' | 'none' | 'unknown';
  lookalike: {
    flag: boolean;
    similarTo: string[];
  };
}

export async function handleVerifyPackage(input: VerifyPackageInput): Promise<ResultEnvelope<VerifyPackageData>> {
  const packageName = input.name ? input.name.trim() : '';

  if (!packageName) {
    return createUnverifiable(
      'verify_package',
      'invalid_input',
      'Package name must not be empty',
      {
        name: '',
        exists: false,
        requestedVersion: input.version || 'latest',
        versionExists: false,
        latest: '',
        deprecated: { isDeprecated: false, message: '' },
        publishedAt: '',
        lastPublishedAt: '',
        repository: null,
        typesStatus: 'unknown',
        lookalike: { flag: false, similarTo: [] },
      }
    );
  }

  // Typosquat check
  const lookalike = checkTyposquat(packageName);
  const warnings: string[] = [];

  if (lookalike.flag) {
    warnings.push(
      `Possible lookalike/typosquatting alert: '${packageName}' is very similar to popular package(s): ${lookalike.similarTo.join(', ')}`
    );
  }

  // Fetch npm metadata
  const { metadata, status, error, cache } = await fetchPackageMetadata(packageName);

  if (status === 'not_found' || !metadata) {
    return createResult<VerifyPackageData>({
      tool: 'verify_package',
      verdict: 'not_found',
      confidence: 'high',
      cache,
      data: {
        name: packageName,
        exists: false,
        requestedVersion: input.version || 'latest',
        versionExists: false,
        latest: '',
        deprecated: { isDeprecated: false, message: '' },
        publishedAt: '',
        lastPublishedAt: '',
        repository: null,
        typesStatus: 'unknown',
        lookalike,
      },
      evidence: [
        {
          type: 'registry',
          ref: `https://registry.npmjs.org/${encodeURIComponent(packageName)}`,
          detail: 'npm registry returned 404 Not Found',
        },
      ],
      warnings,
    });
  }

  if (status === 'error') {
    return createUnverifiable<VerifyPackageData>(
      'verify_package',
      'network',
      error || 'Failed to communicate with npm registry',
      {
        name: packageName,
        exists: false,
        requestedVersion: input.version || 'latest',
        versionExists: false,
        latest: '',
        deprecated: { isDeprecated: false, message: '' },
        publishedAt: '',
        lastPublishedAt: '',
        repository: null,
        typesStatus: 'unknown',
        lookalike,
      }
    );
  }

  const distTags = metadata['dist-tags'] || {};
  const latestVersion = distTags.latest || Object.keys(metadata.versions).pop() || '';
  const requestedVersion = input.version && input.version !== 'latest' ? input.version : latestVersion;

  const versionMeta: PackageVersionMetadata | undefined = metadata.versions[requestedVersion];
  const versionExists = !!versionMeta;

  // Determine repository url
  let repoUrl: string | null = null;
  const rawRepo = versionMeta?.repository || metadata.repository;
  if (typeof rawRepo === 'string') {
    repoUrl = rawRepo;
  } else if (rawRepo && typeof rawRepo === 'object' && rawRepo.url) {
    repoUrl = rawRepo.url.replace(/^git\+/, '').replace(/\.git$/, '');
  }

  // Deprecation info
  const rawDeprecated = versionMeta?.deprecated;
  const isDeprecated = !!rawDeprecated;
  const deprecatedMessage = typeof rawDeprecated === 'string' ? sanitize(rawDeprecated, 300) : '';

  // Determine types status
  let typesStatus: 'bundled' | 'definitelytyped' | 'none' | 'unknown' = 'none';
  if (versionMeta) {
    if (versionMeta.types || versionMeta.typings) {
      typesStatus = 'bundled';
    } else if (versionMeta.exports && JSON.stringify(versionMeta.exports).includes('types')) {
      typesStatus = 'bundled';
    } else {
      // Check if @types exists
      const hasDT = await checkDefinitelyTyped(packageName);
      typesStatus = hasDT ? 'definitelytyped' : 'none';
    }
  }

  // Time stamps
  const timeMap = metadata.time || {};
  const publishedAt = timeMap[requestedVersion] || '';
  const lastPublishedAt = timeMap.modified || timeMap[latestVersion] || '';

  const verdict = versionExists ? 'verified' : 'not_found';

  return createResult<VerifyPackageData>({
    tool: 'verify_package',
    verdict,
    confidence: 'high',
    cache,
    data: {
      name: packageName,
      exists: true,
      requestedVersion,
      versionExists,
      latest: latestVersion,
      deprecated: {
        isDeprecated,
        message: deprecatedMessage,
      },
      publishedAt,
      lastPublishedAt,
      repository: repoUrl ? sanitize(repoUrl, 500) : null,
      typesStatus,
      lookalike,
    },
    evidence: [
      {
        type: 'registry',
        ref: `https://registry.npmjs.org/${encodeURIComponent(packageName)}`,
        detail: versionExists
          ? `Package exists on npm registry at version ${requestedVersion}`
          : `Package exists on npm but requested version ${requestedVersion} not found`,
      },
    ],
    warnings,
  });
}
