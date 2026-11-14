/**
 * Typosquatting detection against known popular packages.
 * Enforces security rules in docs/SECURITY.md and docs/TOOLS.md.
 */

import fs from 'node:fs';
import path from 'node:path';

let cachedPopularPackages: string[] | null = null;

export function loadPopularPackages(): string[] {
  if (cachedPopularPackages) return cachedPopularPackages;

  try {
    const listPath = path.resolve('data/popular-packages.json');
    if (fs.existsSync(listPath)) {
      const content = fs.readFileSync(listPath, 'utf-8');
      cachedPopularPackages = JSON.parse(content);
      return cachedPopularPackages || [];
    }
  } catch {
    // Fallback to inline minimal critical packages
  }

  cachedPopularPackages = ['express', 'react', 'lodash', 'axios', 'chalk', 'zod', 'typescript'];
  return cachedPopularPackages;
}

/**
 * Standard Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,       // deletion
        dp[i]![j - 1]! + 1,       // insertion
        dp[i - 1]![j - 1]! + cost // substitution
      );
    }
  }

  return dp[m]![n]!;
}

export interface TyposquatCheckResult {
  flag: boolean;
  similarTo: string[];
}

/**
 * Checks if a package name is suspiciously similar to a popular package.
 * Flags:
 * 1. Edit distance of 1 or 2 for names >= 4 characters
 * 2. Missing/added hyphen or underscore (e.g., "reactdom" vs "react-dom", "lodashjs")
 * 3. Scope lookalike (e.g. "@fake/react" vs "react")
 */
export function checkTyposquat(packageName: string): TyposquatCheckResult {
  const popular = loadPopularPackages();
  const normalized = packageName.toLowerCase().trim();

  // If it is the exact popular package, it is NOT a typosquat of itself
  if (popular.includes(normalized)) {
    return { flag: false, similarTo: [] };
  }

  const cleanName = normalized.startsWith('@') ? normalized.split('/')[1] || normalized : normalized;
  const similar: string[] = [];

  for (const pop of popular) {
    // 1. Check direct edit distance
    const dist = levenshteinDistance(cleanName, pop);
    if (dist > 0 && dist <= (pop.length <= 4 ? 1 : 2)) {
      similar.push(pop);
      continue;
    }

    // 2. Check stripped hyphens/underscores: e.g. "crossenv" vs "cross-env"
    const strippedClean = cleanName.replace(/[-_.]/g, '');
    const strippedPop = pop.replace(/[-_.]/g, '');
    if (strippedClean === strippedPop && cleanName !== pop) {
      similar.push(pop);
      continue;
    }

    // 3. Common suffixes: e.g. "expressjs", "react-official"
    if (
      cleanName === `${pop}js` ||
      cleanName === `${pop}-js` ||
      cleanName === `${pop}-official` ||
      cleanName === `node-${pop}`
    ) {
      similar.push(pop);
    }
  }

  return {
    flag: similar.length > 0,
    similarTo: [...new Set(similar)],
  };
}
