/**
 * suggest_symbol tool handler.
 * Ranks closest real export names for mistyped or hallucinated symbols.
 * Harmonized with docs/TOOLS.md.
 */

import { handleVerifySymbol } from './verify-symbol.js';
import { levenshteinDistance } from '../verify/typosquat.js';
import { createResult, createUnverifiable, ResultEnvelope } from '../core/result.js';
import { SymbolKind } from '../verify/symbols.js';

export interface SuggestSymbolInput {
  package: string;
  symbol?: string;
  query?: string;
  version?: string;
  importPath?: string;
  limit?: number;
}

export interface SymbolSuggestion {
  name: string;
  kind: SymbolKind;
  signature: string | null;
  distance: number;
}

export interface SuggestSymbolData {
  package: string;
  query: string;
  version: string;
  suggestions: SymbolSuggestion[];
  totalAvailableExports: number;
}

export async function handleSuggestSymbol(input: SuggestSymbolInput): Promise<ResultEnvelope<SuggestSymbolData>> {
  const pkgName = input.package ? input.package.trim() : '';
  const query = (input.symbol || input.query || '').trim();
  const limit = Math.min(Math.max(input.limit || 5, 1), 20);

  if (!pkgName || !query) {
    return createUnverifiable(
      'suggest_symbol',
      'invalid_input',
      'Both package and symbol/query string are required',
      {
        package: pkgName,
        query,
        version: input.version || 'latest',
        suggestions: [],
        totalAvailableExports: 0,
      }
    );
  }

  // Use verify_symbol to fetch and parse declaration exports
  const verifyRes = await handleVerifySymbol({
    package: pkgName,
    symbol: query,
    version: input.version,
    importPath: input.importPath,
  });

  if (verifyRes.verdict === 'unverifiable') {
    return createUnverifiable<SuggestSymbolData>(
      'suggest_symbol',
      verifyRes.reason || 'analysis_incomplete',
      verifyRes.warnings.join('; ') || 'Could not analyze package exports',
      {
        package: pkgName,
        query,
        version: verifyRes.data.resolvedVersion || input.version || 'latest',
        suggestions: [],
        totalAvailableExports: 0,
      }
    );
  }

  const allExports = verifyRes.data.availableExports;
  if (!allExports || allExports.length === 0) {
    return createResult<SuggestSymbolData>({
      tool: 'suggest_symbol',
      verdict: 'not_found',
      confidence: 'medium',
      data: {
        package: pkgName,
        query,
        version: verifyRes.data.resolvedVersion,
        suggestions: [],
        totalAvailableExports: 0,
      },
      evidence: verifyRes.evidence,
      warnings: [`No exports found in package '${pkgName}'.`],
    });
  }

  const queryLower = query.toLowerCase();

  // Score each export
  const scored = allExports.map((name) => {
    const nameLower = name.toLowerCase();
    let dist = levenshteinDistance(queryLower, nameLower);

    // Boost exact case-insensitive match
    if (queryLower === nameLower) dist = 0.1;
    // Boost substring match
    else if (nameLower.includes(queryLower)) dist = Math.max(0.5, dist * 0.5);

    return {
      name,
      kind: 'unknown' as SymbolKind,
      signature: null,
      distance: Math.round(dist * 10) / 10,
    };
  });

  // Sort by lowest distance
  scored.sort((a, b) => a.distance - b.distance);
  const topSuggestions = scored.slice(0, limit);

  return createResult<SuggestSymbolData>({
    tool: 'suggest_symbol',
    verdict: topSuggestions.length > 0 ? 'verified' : 'not_found',
    confidence: 'high',
    data: {
      package: pkgName,
      query,
      version: verifyRes.data.resolvedVersion,
      suggestions: topSuggestions,
      totalAvailableExports: verifyRes.data.allExportsCount || allExports.length,
    },
    evidence: [
      {
        type: 'declaration',
        ref: `${pkgName}@${verifyRes.data.resolvedVersion}`,
        detail: `Found ${topSuggestions.length} closest real symbols matching '${query}' from ${verifyRes.data.allExportsCount} exports`,
      },
    ],
    warnings: [],
  });
}
