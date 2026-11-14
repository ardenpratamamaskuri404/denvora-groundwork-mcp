/**
 * Tarball extraction sandbox and integrity verification.
 * Enforces security invariants in docs/SECURITY.md and docs/ARCHITECTURE.md.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import * as tar from 'tar';
import { safeFetch } from '../core/http.js';
import { LIMITS } from '../core/limits.js';
import { defaultCache } from '../core/cache.js';

export class TarballSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TarballSecurityError';
  }
}

export interface ExtractedPackage {
  packageDir: string;
  entryDeclarationFile: string | null;
  cleanup: () => void;
}

/**
 * Verifies sha512 integrity string or sha1 shasum against a Buffer.
 */
export function verifyIntegrity(buffer: Buffer, integrityOrShasum?: string): boolean {
  if (!integrityOrShasum) return true; // If registry has no integrity hash, allow fallback

  if (integrityOrShasum.startsWith('sha512-')) {
    const expected = integrityOrShasum.replace('sha512-', '');
    const actual = crypto.createHash('sha512').update(buffer).digest('base64');
    return expected === actual;
  }

  if (integrityOrShasum.startsWith('sha1-')) {
    const expected = integrityOrShasum.replace('sha1-', '');
    const actual = crypto.createHash('sha1').update(buffer).digest('base64');
    return expected === actual;
  }

  // Hex sha1 (shasum)
  if (/^[a-f0-9]{40}$/i.test(integrityOrShasum)) {
    const actual = crypto.createHash('sha1').update(buffer).digest('hex');
    return integrityOrShasum.toLowerCase() === actual.toLowerCase();
  }

  return true;
}

/**
 * Downloads and safely extracts a package tarball into an isolated temporary directory.
 * Only extracts package.json and TypeScript declaration files (*.d.ts, *.d.mts, *.d.cts).
 */
export async function downloadAndExtractTarball(
  tarballUrl: string,
  integrity?: string
): Promise<ExtractedPackage> {
  // Download tarball
  const response = await safeFetch(tarballUrl, {
    maxBytes: LIMITS.MAX_COMPRESSED_TARBALL_BYTES,
  });

  if (!response.ok) {
    throw new Error(`Failed to download tarball: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Check size cap
  if (buffer.length > LIMITS.MAX_COMPRESSED_TARBALL_BYTES) {
    throw new TarballSecurityError(
      `Tarball size (${buffer.length} bytes) exceeds maximum limit (${LIMITS.MAX_COMPRESSED_TARBALL_BYTES} bytes).`
    );
  }

  // Check integrity
  if (integrity && !verifyIntegrity(buffer, integrity)) {
    throw new TarballSecurityError('Tarball integrity verification failed (checksum mismatch).');
  }

  // Create isolated temp directory
  const tempDir = path.join(
    os.tmpdir(),
    'denvora-tarball-' + Date.now() + '-' + Math.random().toString(36).slice(2)
  );
  fs.mkdirSync(tempDir, { recursive: true, mode: 0o700 });

  let fileCount = 0;
  let totalExtractedBytes = 0;

  // Safe tar parser stream
  const tarballPath = path.join(tempDir, 'package.tgz');
  fs.writeFileSync(tarballPath, buffer);

  try {
    await tar.extract({
      file: tarballPath,
      cwd: tempDir,
      strict: true,
      filter: (filePath, entry) => {
        // Safe extract guards:
        // 1. Prevent path traversal
        if (filePath.includes('..') || path.isAbsolute(filePath)) {
          throw new TarballSecurityError(`Path traversal attempt detected in tarball: ${filePath}`);
        }

        // 2. Reject symlinks escaping root
        if ('type' in entry && (entry.type === 'SymbolicLink' || entry.type === 'Link')) {
          return false; // Skip links completely
        }

        // 3. Only keep declaration files and package.json
        const isPkgJson = filePath.endsWith('package.json');
        const isDts =
          filePath.endsWith('.d.ts') ||
          filePath.endsWith('.d.mts') ||
          filePath.endsWith('.d.cts');

        if (!isPkgJson && !isDts) {
          return false;
        }

        fileCount++;
        if (fileCount > LIMITS.MAX_DECLARATION_FILES) {
          throw new TarballSecurityError(
            `Tarball contains too many declaration files (limit: ${LIMITS.MAX_DECLARATION_FILES}).`
          );
        }

        const fileSize = entry.size || 0;
        if (isDts && fileSize > LIMITS.MAX_SINGLE_DECLARATION_BYTES) {
          throw new TarballSecurityError(
            `Single declaration file ${filePath} (${fileSize} bytes) exceeds limit (${LIMITS.MAX_SINGLE_DECLARATION_BYTES} bytes).`
          );
        }

        totalExtractedBytes += fileSize;
        if (totalExtractedBytes > LIMITS.MAX_EXTRACTED_BYTES) {
          throw new TarballSecurityError(
            `Total extracted size exceeds limit (${LIMITS.MAX_EXTRACTED_BYTES} bytes).`
          );
        }

        return true;
      },
    });
  } catch (err) {
    // Clean up on failure
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    throw err;
  } finally {
    // Remove the compressed tarball file to save space
    try { fs.unlinkSync(tarballPath); } catch {}
  }

  // npm tarballs conventionally extract into a top-level "package/" folder
  const standardPackageDir = path.join(tempDir, 'package');
  const packageDir = fs.existsSync(standardPackageDir) ? standardPackageDir : tempDir;

  return {
    packageDir,
    entryDeclarationFile: null,
    cleanup: () => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    },
  };
}
