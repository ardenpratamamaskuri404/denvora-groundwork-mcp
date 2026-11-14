/**
 * Static symbol analysis using the TypeScript Compiler API.
 * Never executes package code. Pure static declaration parsing.
 */

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { stripCommentsFromSignature, sanitize } from '../core/sanitize.js';

export type SymbolKind =
  | 'function'
  | 'class'
  | 'type'
  | 'interface'
  | 'variable'
  | 'enum'
  | 'namespace'
  | 'unknown';

export interface ExportedSymbol {
  name: string;
  kind: SymbolKind;
  signature: string | null;
  isDeprecated: boolean;
  deprecationMessage: string;
}

export interface SymbolAnalysisResult {
  entryFile: string | null;
  hasTypes: boolean;
  symbols: Map<string, ExportedSymbol>;
  allExports: string[];
  error?: string;
}

/**
 * Resolves the primary .d.ts entry file for a package or subpath.
 */
export function resolveDeclarationEntry(packageDir: string, subpath: string = '.'): string | null {
  const pkgJsonPath = path.join(packageDir, 'package.json');
  let pkgJson: Record<string, unknown> = {};

  if (fs.existsSync(pkgJsonPath)) {
    try {
      pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    } catch {}
  }

  // Helper to test if a relative path exists as .d.ts file
  const testCandidate = (relPath?: unknown): string | null => {
    if (typeof relPath !== 'string') return null;
    const candidates = [
      path.resolve(packageDir, relPath),
      path.resolve(packageDir, relPath + '.d.ts'),
      path.resolve(packageDir, relPath, 'index.d.ts'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        return c;
      }
    }
    return null;
  };

  // 1. If looking for root "."
  if (subpath === '.' || !subpath) {
    // Check exports["."]
    if (pkgJson.exports && typeof pkgJson.exports === 'object') {
      const exportsObj = pkgJson.exports as Record<string, unknown>;
      const rootExport = exportsObj['.'] || exportsObj;
      if (typeof rootExport === 'string' && rootExport.endsWith('.d.ts')) {
        const found = testCandidate(rootExport);
        if (found) return found;
      } else if (typeof rootExport === 'object' && rootExport !== null) {
        const r = rootExport as Record<string, unknown>;
        const found = testCandidate(r.types || r.typings);
        if (found) return found;
      }
    }

    // Check types / typings
    const foundTypes = testCandidate(pkgJson.types || pkgJson.typings);
    if (foundTypes) return foundTypes;

    // Check main if it points to .d.ts or has companion .d.ts
    if (typeof pkgJson.main === 'string') {
      const mainBase = pkgJson.main.replace(/\.(c|m)?js$/, '');
      const foundMainDts = testCandidate(mainBase + '.d.ts');
      if (foundMainDts) return foundMainDts;
    }

    // Fallback to index.d.ts
    const indexDts = path.join(packageDir, 'index.d.ts');
    if (fs.existsSync(indexDts)) return indexDts;
  } else {
    // 2. Subpath resolution, e.g. "./client"
    const normalizedSub = subpath.startsWith('./') ? subpath : `./${subpath}`;
    if (pkgJson.exports && typeof pkgJson.exports === 'object') {
      const exportsObj = pkgJson.exports as Record<string, unknown>;
      const subExport = exportsObj[normalizedSub];
      if (typeof subExport === 'object' && subExport !== null) {
        const s = subExport as Record<string, unknown>;
        const found = testCandidate(s.types || s.typings);
        if (found) return found;
      } else if (typeof subExport === 'string') {
        const found = testCandidate(subExport);
        if (found) return found;
      }
    }

    // Direct folder or file candidate
    const directCandidate = testCandidate(subpath);
    if (directCandidate) return directCandidate;
  }

  // Search recursively for any index.d.ts as last resort
  const findAnyIndexDts = (dir: string): string | null => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name === 'index.d.ts') {
          return path.join(dir, entry.name);
        }
        if (entry.isDirectory() && entry.name !== 'node_modules') {
          const res = findAnyIndexDts(path.join(dir, entry.name));
          if (res) return res;
        }
      }
    } catch {}
    return null;
  };

  return findAnyIndexDts(packageDir);
}

/**
 * Analyzes all exported symbols from the target declaration entry file using the TypeScript Compiler API.
 */
export function analyzeExportedSymbols(entryFilePath: string): SymbolAnalysisResult {
  const symbols = new Map<string, ExportedSymbol>();

  if (!fs.existsSync(entryFilePath)) {
    return {
      entryFile: null,
      hasTypes: false,
      symbols,
      allExports: [],
      error: 'Entry declaration file does not exist',
    };
  }

  try {
    const program = ts.createProgram([entryFilePath], {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      allowJs: false,
      declaration: true,
      skipLibCheck: true,
    });

    const checker = program.getTypeChecker();
    const sourceFile = program.getSourceFile(entryFilePath);

    if (!sourceFile) {
      return {
        entryFile: entryFilePath,
        hasTypes: false,
        symbols,
        allExports: [],
        error: 'Failed to parse declaration AST',
      };
    }

    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    if (moduleSymbol) {
      const exports = checker.getExportsOfModule(moduleSymbol);

      for (const exp of exports) {
        const name = exp.getName();
        if (name === '__esModule') continue;

        let kind: SymbolKind = 'unknown';
        const flags = exp.getFlags();

        if (flags & ts.SymbolFlags.Function) kind = 'function';
        else if (flags & ts.SymbolFlags.Class) kind = 'class';
        else if (flags & ts.SymbolFlags.Interface) kind = 'interface';
        else if (flags & ts.SymbolFlags.TypeAlias) kind = 'type';
        else if (flags & ts.SymbolFlags.Variable) kind = 'variable';
        else if (flags & ts.SymbolFlags.Enum) kind = 'enum';
        else if (flags & ts.SymbolFlags.NamespaceModule) kind = 'namespace';

        // Read declaration signature
        let rawSignature: string | null = null;
        let isDeprecated = false;
        let deprecationMessage = '';

        const declarations = exp.getDeclarations();
        if (declarations && declarations.length > 0) {
          const firstDecl = declarations[0];
          if (firstDecl) {
            rawSignature = firstDecl.getText(sourceFile);

            // Check JSDoc deprecation tag
            const jsDocTags = ts.getJSDocTags(firstDecl);
            for (const tag of jsDocTags) {
              if (tag.tagName.text === 'deprecated') {
                isDeprecated = true;
                deprecationMessage = tag.comment ? String(tag.comment) : '';
              }
            }
          }
        }

        const cleanSignature = rawSignature
          ? sanitize(stripCommentsFromSignature(rawSignature), 1000)
          : null;

        symbols.set(name, {
          name,
          kind,
          signature: cleanSignature,
          isDeprecated,
          deprecationMessage: sanitize(deprecationMessage, 300),
        });
      }
    }

    // Fallback: If moduleSymbol had no exports, scan AST root statements directly
    if (symbols.size === 0) {
      ts.forEachChild(sourceFile, (node) => {
        // e.g. export function foo(), export interface Bar {}
        const isExported =
          ts.canHaveModifiers(node) &&
          ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

        if (isExported) {
          let name: string | null = null;
          let kind: SymbolKind = 'unknown';

          if (ts.isFunctionDeclaration(node) && node.name) {
            name = node.name.text;
            kind = 'function';
          } else if (ts.isClassDeclaration(node) && node.name) {
            name = node.name.text;
            kind = 'class';
          } else if (ts.isInterfaceDeclaration(node)) {
            name = node.name.text;
            kind = 'interface';
          } else if (ts.isTypeAliasDeclaration(node)) {
            name = node.name.text;
            kind = 'type';
          } else if (ts.isVariableStatement(node)) {
            for (const decl of node.declarationList.declarations) {
              if (ts.isIdentifier(decl.name)) {
                symbols.set(decl.name.text, {
                  name: decl.name.text,
                  kind: 'variable',
                  signature: sanitize(stripCommentsFromSignature(node.getText(sourceFile)), 1000),
                  isDeprecated: false,
                  deprecationMessage: '',
                });
              }
            }
            return;
          }

          if (name) {
            symbols.set(name, {
              name,
              kind,
              signature: sanitize(stripCommentsFromSignature(node.getText(sourceFile)), 1000),
              isDeprecated: false,
              deprecationMessage: '',
            });
          }
        }
      });
    }

    return {
      entryFile: entryFilePath,
      hasTypes: true,
      symbols,
      allExports: Array.from(symbols.keys()).sort(),
    };
  } catch (err: unknown) {
    return {
      entryFile: entryFilePath,
      hasTypes: true,
      symbols,
      allExports: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
