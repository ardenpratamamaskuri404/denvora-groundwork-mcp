/**
 * scan_vulnerabilities tool handler.
 * Queries official OSV advisory database.
 * Harmonized with docs/TOOLS.md and docs/SECURITY.md.
 */

import { safeFetch } from '../core/http.js';
import { sanitize } from '../core/sanitize.js';
import { createResult, createUnverifiable, ResultEnvelope } from '../core/result.js';

export interface ScanVulnerabilitiesInput {
  package: string;
  version: string;
  ecosystem?: 'npm';
}

export interface AdvisoryItem {
  id: string;
  summary: string;
  severity: string;
  aliases: string[];
  url: string;
}

export interface ScanVulnerabilitiesData {
  package: string;
  version: string;
  ecosystem: 'npm';
  hasVulnerabilities: boolean;
  advisoryCount: number;
  advisories: AdvisoryItem[];
}

export async function handleScanVulnerabilities(
  input: ScanVulnerabilitiesInput
): Promise<ResultEnvelope<ScanVulnerabilitiesData>> {
  const pkgName = input.package ? input.package.trim() : '';
  const version = input.version ? input.version.trim() : '';
  const ecosystem = 'npm';

  if (!pkgName || !version) {
    return createUnverifiable(
      'scan_vulnerabilities',
      'invalid_input',
      'Both package and version are required for vulnerability scanning',
      {
        package: pkgName,
        version,
        ecosystem,
        hasVulnerabilities: false,
        advisoryCount: 0,
        advisories: [],
      }
    );
  }

  const queryUrl = 'https://api.osv.dev/v1/query';

  try {
    const response = await safeFetch(queryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        package: {
          name: pkgName,
          ecosystem: 'npm',
        },
        version,
      }),
    });

    if (!response.ok) {
      return createUnverifiable<ScanVulnerabilitiesData>(
        'scan_vulnerabilities',
        'network',
        `OSV database returned HTTP status ${response.status}`,
        {
          package: pkgName,
          version,
          ecosystem,
          hasVulnerabilities: false,
          advisoryCount: 0,
          advisories: [],
        }
      );
    }

    const json = (await response.json()) as { vulns?: Array<Record<string, unknown>> };
    const rawVulns = json.vulns || [];

    const advisories: AdvisoryItem[] = rawVulns.map((v) => {
      const id = String(v.id || 'UNKNOWN');
      const summary = typeof v.summary === 'string' ? sanitize(v.summary, 300) : 'No summary provided';
      const aliases = Array.isArray(v.aliases) ? v.aliases.map(String) : [];

      // Determine severity from database scores
      let severity = 'UNKNOWN';
      if (Array.isArray(v.severity) && v.severity.length > 0) {
        severity = String(v.severity[0].score || 'UNKNOWN');
      } else if (v.database_specific && typeof v.database_specific === 'object') {
        const dbSpecific = v.database_specific as Record<string, unknown>;
        if (typeof dbSpecific.severity === 'string') {
          severity = dbSpecific.severity;
        }
      }

      return {
        id,
        summary,
        severity: sanitize(severity, 50),
        aliases,
        url: `https://osv.dev/vulnerability/${id}`,
      };
    });

    const hasVulnerabilities = advisories.length > 0;

    return createResult<ScanVulnerabilitiesData>({
      tool: 'scan_vulnerabilities',
      verdict: 'verified',
      confidence: 'high',
      data: {
        package: pkgName,
        version,
        ecosystem,
        hasVulnerabilities,
        advisoryCount: advisories.length,
        advisories,
      },
      evidence: [
        {
          type: 'advisory-db',
          ref: queryUrl,
          detail: hasVulnerabilities
            ? `Found ${advisories.length} known security advisories in OSV database for ${pkgName}@${version}`
            : `Queried OSV advisory database: no known advisories found for ${pkgName}@${version}`,
        },
      ],
      warnings: hasVulnerabilities
        ? [`Known security vulnerabilities reported for ${pkgName}@${version}. Review advisories.`]
        : [],
    });
  } catch (err: unknown) {
    return createUnverifiable<ScanVulnerabilitiesData>(
      'scan_vulnerabilities',
      'network',
      err instanceof Error ? err.message : String(err),
      {
        package: pkgName,
        version,
        ecosystem,
        hasVulnerabilities: false,
        advisoryCount: 0,
        advisories: [],
      }
    );
  }
}
