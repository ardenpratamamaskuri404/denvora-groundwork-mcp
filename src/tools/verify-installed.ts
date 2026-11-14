/**
 * verify_installed tool handler.
 * Verifies packages and symbols actually installed in the local project.
 * Enforces Secret & Privacy Shield and read-only safety.
 * Harmonized with docs/TOOLS.md and docs/SECURITY.md.
 */

import fs from 'node:fs';
import path from 'node:path';
import { isBlacklistedSecretFile, isValidPackageName } from '../core/limits.js';
import { resolveDeclarationEntry, analyzeExportedSymbols, SymbolKind } from '../verify/symbols.js';
import { createResult, createUnverifiable, createInvalidInput, ResultEnvelope } from '../core/result.js';

export interface VerifyInstalledInput {
  package: string;
  symbol?: string;
  projectRoot?: string;
  importPath?: string;
}

export interface VerifyInstalledData {
  package: string;
  installedVersion: string | null;
  isInstalled: boolean;
  symbolChecked?: string;
  symbolFound?: boolean;
  symbolKind?: SymbolKind;
  symbolSignature?: string | null;
  declarationFile?: string | null;
  allExportsCount?: number;
}

export async function handleVerifyInstalled(
  input: VerifyInstalledInput
): Promise<ResultEnvelope<VerifyInstalledData>> {
  const pkgName = input.package ? input.package.trim() : '';
  const rootDir = path.resolve(input.projectRoot || process.cwd());
  const symbol = input.symbol ? input.symbol.trim() : undefined;
  const importPath = input.importPath || '.';

  // 1. Secret & Privacy Shield Check
  if (isBlacklistedSecretFile(pkgName) || isBlacklistedSecretFile(rootDir)) {
    return createInvalidInput(
      'verify_installed',
      'Target path references a blacklisted credential or secret file (.env, key, pem)'
    ) as unknown as ResultEnvelope<VerifyInstalledData>;
  }

  // Prevent path traversal outside node_modules (e.g. "../../.env")
  if (!isValidPackageName(pkgName)) {
    return createInvalidInput(
      'verify_installed',
      `Invalid package name '${pkgName}'. Package names must be valid npm identifiers and cannot contain path traversals or special characters.`
    ) as unknown as ResultEnvelope<VerifyInstalledData>;
  }

  const expectedNodeModules = path.join(rootDir, 'node_modules');
  const installedDir = path.resolve(expectedNodeModules, pkgName);

  // Containment check
  if (!installedDir.startsWith(expectedNodeModules)) {
    return createInvalidInput(
      'verify_installed',
      'Package path escapes node_modules directory boundary'
    ) as unknown as ResultEnvelope<VerifyInstalledData>;
  }

  // 2. Read package.json and node_modules/<pkg>/package.json
  const installedPkgJsonPath = path.join(installedDir, 'package.json');

  if (!fs.existsSync(installedPkgJsonPath)) {
    return createUnverifiable<VerifyInstalledData>(
      'verify_installed',
      'not_installed',
      `Package '${pkgName}' is not installed in local node_modules at ${rootDir}`,
      {
        package: pkgName,
        installedVersion: null,
        isInstalled: false,
      }
    );
  }

  let installedVersion: string | null = null;
  try {
    const raw = fs.readFileSync(installedPkgJsonPath, 'utf-8');
    const parsed = JSON.parse(raw);
    installedVersion = parsed.version || null;
  } catch {
    return createUnverifiable<VerifyInstalledData>(
      'verify_installed',
      'analysis_incomplete',
      `Failed to parse local package.json for '${pkgName}' in node_modules`,
      {
        package: pkgName,
        installedVersion: null,
        isInstalled: false,
      }
    );
  }

  // If no symbol check requested, we verify package existence in node_modules
  if (!symbol) {
    return createResult<VerifyInstalledData>({
      tool: 'verify_installed',
      verdict: 'verified',
      confidence: 'high',
      data: {
        package: pkgName,
        installedVersion,
        isInstalled: true,
      },
      evidence: [
        {
          type: 'project-file',
          ref: installedPkgJsonPath,
          detail: `Found '${pkgName}@${installedVersion}' locally in node_modules`,
        },
      ],
      warnings: [],
    });
  }

  // 3. Symbol verification against local node_modules
  const declarationFile = resolveDeclarationEntry(installedDir, importPath);

  if (!declarationFile) {
    return createUnverifiable<VerifyInstalledData>(
      'verify_installed',
      'no_types',
      `Locally installed '${pkgName}@${installedVersion}' does not provide declaration files (.d.ts).`,
      {
        package: pkgName,
        installedVersion,
        isInstalled: true,
        symbolChecked: symbol,
        symbolFound: false,
      }
    );
  }

  const analysis = analyzeExportedSymbols(declarationFile);
  const matched = analysis.symbols.get(symbol);
  const symbolFound = !!matched;
  const verdict = symbolFound ? 'verified' : 'not_found';

  return createResult<VerifyInstalledData>({
    tool: 'verify_installed',
    verdict,
    confidence: 'high',
    data: {
      package: pkgName,
      installedVersion,
      isInstalled: true,
      symbolChecked: symbol,
      symbolFound,
      symbolKind: matched?.kind || 'unknown',
      symbolSignature: matched?.signature || null,
      declarationFile,
      allExportsCount: analysis.allExports.length,
    },
    evidence: [
      {
        type: 'declaration',
        ref: declarationFile,
        detail: symbolFound
          ? `Symbol '${symbol}' verified in local node_modules (${declarationFile})`
          : `Symbol '${symbol}' not found in local node_modules declarations`,
      },
    ],
    warnings: [],
  });
}
