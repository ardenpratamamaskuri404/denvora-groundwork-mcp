/**
 * verify_symbol tool handler.
 * Static verification of exported functions, classes, and types.
 * Harmonized with docs/TOOLS.md.
 */

import { fetchPackageMetadata, PackageVersionMetadata } from '../verify/registry.js';
import { downloadAndExtractTarball } from '../verify/tarball.js';
import { resolveDeclarationEntry, analyzeExportedSymbols, SymbolKind } from '../verify/symbols.js';
import { createResult, createUnverifiable, ResultEnvelope } from '../core/result.js';

export interface VerifySymbolInput {
  package: string;
  symbol: string;
  version?: string;
  importPath?: string;
  ecosystem?: 'npm';
}

export interface VerifySymbolData {
  package: string;
  requestedVersion: string;
  resolvedVersion: string;
  symbol: string;
  importPath: string;
  found: boolean;
  kind: SymbolKind;
  signature: string | null;
  isDeprecated: boolean;
  deprecationMessage: string;
  allExportsCount: number;
  availableExports: string[];
}

export async function handleVerifySymbol(input: VerifySymbolInput): Promise<ResultEnvelope<VerifySymbolData>> {
  const pkgName = input.package ? input.package.trim() : '';
  const symbolName = input.symbol ? input.symbol.trim() : '';
  const importPath = input.importPath || '.';

  if (!pkgName || !symbolName) {
    return createUnverifiable(
      'verify_symbol',
      'invalid_input',
      'Both package and symbol name are required',
      {
        package: pkgName,
        requestedVersion: input.version || 'latest',
        resolvedVersion: '',
        symbol: symbolName,
        importPath,
        found: false,
        kind: 'unknown',
        signature: null,
        isDeprecated: false,
        deprecationMessage: '',
        allExportsCount: 0,
        availableExports: [],
      }
    );
  }

  // 1. Fetch package metadata
  const { metadata, status, error } = await fetchPackageMetadata(pkgName);
  if (status === 'not_found' || !metadata) {
    return createResult<VerifySymbolData>({
      tool: 'verify_symbol',
      verdict: 'not_found',
      confidence: 'high',
      data: {
        package: pkgName,
        requestedVersion: input.version || 'latest',
        resolvedVersion: '',
        symbol: symbolName,
        importPath,
        found: false,
        kind: 'unknown',
        signature: null,
        isDeprecated: false,
        deprecationMessage: '',
        allExportsCount: 0,
        availableExports: [],
      },
      evidence: [
        {
          type: 'registry',
          ref: `https://registry.npmjs.org/${encodeURIComponent(pkgName)}`,
          detail: 'Package not found on npm registry',
        },
      ],
      warnings: [`Package '${pkgName}' does not exist on npm.`],
    });
  }

  if (status === 'error') {
    return createUnverifiable<VerifySymbolData>(
      'verify_symbol',
      'network',
      error || 'Failed to fetch package metadata from npm registry',
      {
        package: pkgName,
        requestedVersion: input.version || 'latest',
        resolvedVersion: '',
        symbol: symbolName,
        importPath,
        found: false,
        kind: 'unknown',
        signature: null,
        isDeprecated: false,
        deprecationMessage: '',
        allExportsCount: 0,
        availableExports: [],
      }
    );
  }

  const distTags = metadata['dist-tags'] || {};
  const latestVersion = distTags.latest || Object.keys(metadata.versions).pop() || '';
  const resolvedVersion = input.version && input.version !== 'latest' ? input.version : latestVersion;

  const versionMeta: PackageVersionMetadata | undefined = metadata.versions[resolvedVersion];
  if (!versionMeta) {
    return createResult<VerifySymbolData>({
      tool: 'verify_symbol',
      verdict: 'not_found',
      confidence: 'high',
      data: {
        package: pkgName,
        requestedVersion: input.version || 'latest',
        resolvedVersion,
        symbol: symbolName,
        importPath,
        found: false,
        kind: 'unknown',
        signature: null,
        isDeprecated: false,
        deprecationMessage: '',
        allExportsCount: 0,
        availableExports: [],
      },
      evidence: [
        {
          type: 'registry',
          ref: `https://registry.npmjs.org/${encodeURIComponent(pkgName)}`,
          detail: `Version ${resolvedVersion} not found in package releases`,
        },
      ],
      warnings: [`Version '${resolvedVersion}' does not exist for package '${pkgName}'.`],
    });
  }

  const tarballUrl = versionMeta.dist?.tarball;
  if (!tarballUrl) {
    return createUnverifiable<VerifySymbolData>(
      'verify_symbol',
      'untyped_exports',
      'No tarball distribution URL available for this package version',
      {
        package: pkgName,
        requestedVersion: input.version || 'latest',
        resolvedVersion,
        symbol: symbolName,
        importPath,
        found: false,
        kind: 'unknown',
        signature: null,
        isDeprecated: false,
        deprecationMessage: '',
        allExportsCount: 0,
        availableExports: [],
      }
    );
  }

  const integrity = versionMeta.dist.integrity || versionMeta.dist.shasum;

  // 2. Download and extract declaration files safely
  let extracted;
  try {
    extracted = await downloadAndExtractTarball(tarballUrl, integrity);
  } catch (err: unknown) {
    return createUnverifiable<VerifySymbolData>(
      'verify_symbol',
      'size_limit',
      err instanceof Error ? err.message : String(err),
      {
        package: pkgName,
        requestedVersion: input.version || 'latest',
        resolvedVersion,
        symbol: symbolName,
        importPath,
        found: false,
        kind: 'unknown',
        signature: null,
        isDeprecated: false,
        deprecationMessage: '',
        allExportsCount: 0,
        availableExports: [],
      }
    );
  }

  try {
    // 3. Resolve entry declaration file
    let entryFile = resolveDeclarationEntry(extracted.packageDir, importPath);

    // If no declaration in primary package, check if @types/<pkg> is needed
    if (!entryFile) {
      // Check if @types exists
      const dtName = pkgName.startsWith('@')
        ? `@types/${pkgName.slice(1).replace('/', '__')}`
        : `@types/${pkgName}`;

      const dtMeta = await fetchPackageMetadata(dtName);
      if (dtMeta.metadata) {
        const dtLatest = dtMeta.metadata['dist-tags']?.latest;
        const dtVer = dtLatest ? dtMeta.metadata.versions[dtLatest] : undefined;
        if (dtVer?.dist?.tarball) {
          try {
            const dtExtracted = await downloadAndExtractTarball(
              dtVer.dist.tarball,
              dtVer.dist.integrity || dtVer.dist.shasum
            );
            entryFile = resolveDeclarationEntry(dtExtracted.packageDir, importPath);
          } catch {}
        }
      }
    }

    if (!entryFile) {
      return createUnverifiable<VerifySymbolData>(
        'verify_symbol',
        'no_types',
        `Package '${pkgName}@${resolvedVersion}' does not provide TypeScript declarations (.d.ts).`,
        {
          package: pkgName,
          requestedVersion: input.version || 'latest',
          resolvedVersion,
          symbol: symbolName,
          importPath,
          found: false,
          kind: 'unknown',
          signature: null,
          isDeprecated: false,
          deprecationMessage: '',
          allExportsCount: 0,
          availableExports: [],
        }
      );
    }

    // 4. Run AST analysis using TypeScript compiler API
    const analysis = analyzeExportedSymbols(entryFile);

    if (analysis.error) {
      return createUnverifiable<VerifySymbolData>(
        'verify_symbol',
        'analysis_incomplete',
        `TypeScript AST analysis error: ${analysis.error}`,
        {
          package: pkgName,
          requestedVersion: input.version || 'latest',
          resolvedVersion,
          symbol: symbolName,
          importPath,
          found: false,
          kind: 'unknown',
          signature: null,
          isDeprecated: false,
          deprecationMessage: '',
          allExportsCount: analysis.allExports.length,
          availableExports: analysis.allExports.slice(0, 30),
        }
      );
    }

    const matched = analysis.symbols.get(symbolName);
    const found = !!matched;
    const verdict = found ? 'verified' : 'not_found';

    return createResult<VerifySymbolData>({
      tool: 'verify_symbol',
      verdict,
      confidence: 'high',
      data: {
        package: pkgName,
        requestedVersion: input.version || 'latest',
        resolvedVersion,
        symbol: symbolName,
        importPath,
        found,
        kind: matched?.kind || 'unknown',
        signature: matched?.signature || null,
        isDeprecated: matched?.isDeprecated || false,
        deprecationMessage: matched?.deprecationMessage || '',
        allExportsCount: analysis.allExports.length,
        availableExports: analysis.allExports.slice(0, 50),
      },
      evidence: [
        {
          type: 'declaration',
          ref: entryFile,
          detail: found
            ? `Symbol '${symbolName}' (${matched?.kind}) verified in TypeScript declarations`
            : `Exhaustive declaration analysis completed. Symbol '${symbolName}' is not exported from '${pkgName}'`,
        },
      ],
      warnings: [],
    });
  } finally {
    extracted.cleanup();
  }
}
