/**
 * Local disk cache with TTL and integrity keys.
 * Harmonized with docs/ARCHITECTURE.md and docs/SECURITY.md.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

export interface CacheEntry<T> {
  key: string;
  data: T;
  cachedAt: number; // Unix timestamp ms
  ttlMs: number;
  integrity?: string;
}

export class DiskCache {
  private baseDir: string;

  constructor(customDir?: string) {
    this.baseDir = customDir || process.env.CACHE_DIR || path.join(os.homedir(), '.denvora', 'groundwork-cache');
    this.ensureDir(this.baseDir);
  }

  private ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
    }
  }

  private getFilePath(key: string): string {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const subDir = path.join(this.baseDir, hash.slice(0, 2));
    this.ensureDir(subDir);
    return path.join(subDir, `${hash}.json`);
  }

  public get<T>(key: string): { data: T; isStale: boolean } | null {
    const filePath = this.getFilePath(key);
    if (!fs.existsSync(filePath)) return null;

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const entry: CacheEntry<T> = JSON.parse(raw);
      const age = Date.now() - entry.cachedAt;
      const isStale = age > entry.ttlMs;

      return {
        data: entry.data,
        isStale,
      };
    } catch {
      return null;
    }
  }

  public set<T>(key: string, data: T, ttlMs: number, integrity?: string): void {
    const filePath = this.getFilePath(key);
    const tempPath = `${filePath}.${Date.now()}.tmp`;

    const entry: CacheEntry<T> = {
      key,
      data,
      cachedAt: Date.now(),
      ttlMs,
      integrity,
    };

    try {
      fs.writeFileSync(tempPath, JSON.stringify(entry), 'utf-8');
      fs.renameSync(tempPath, filePath);
    } catch {
      // Clean up temp file on failure
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch {}
      }
    }
  }

  public delete(key: string): void {
    const filePath = this.getFilePath(key);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }

  public clear(): void {
    if (fs.existsSync(this.baseDir)) {
      try {
        fs.rmSync(this.baseDir, { recursive: true, force: true });
        this.ensureDir(this.baseDir);
      } catch {}
    }
  }
}

export const defaultCache = new DiskCache();
