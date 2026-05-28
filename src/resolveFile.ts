import { readFileSync } from 'fs';

export interface ResolveFileInput {
  file_path?: string;
  url?: string;
  base64?: string;
  /** Filename hint — used with base64 or when URL doesn't contain a filename */
  filename?: string;
}

export interface ResolvedFile {
  buffer: Buffer;
  filename: string;
}

function filenameFromPath(filePath: string): string {
  return filePath.split('/').pop() || filePath;
}

function filenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split('/').pop();
    return last && last.includes('.') ? last : 'download';
  } catch {
    return 'download';
  }
}

/**
 * Resolve a file from a local path, URL, or base64 string.
 * At least one of file_path, url, or base64 must be provided.
 */
export async function resolveFile(input: ResolveFileInput): Promise<ResolvedFile> {
  if (input.file_path) {
    return {
      buffer: readFileSync(input.file_path),
      filename: input.filename || filenameFromPath(input.file_path),
    };
  }

  if (input.url) {
    const response = await fetch(input.url);
    if (!response.ok) {
      throw new Error(`Failed to download file from URL: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      filename: input.filename || filenameFromUrl(input.url),
    };
  }

  if (input.base64) {
    // Strip data URI prefix if present (e.g. "data:image/jpeg;base64,...")
    const raw = input.base64.includes(',')
      ? input.base64.slice(input.base64.indexOf(',') + 1)
      : input.base64;
    return {
      buffer: Buffer.from(raw, 'base64'),
      filename: input.filename || 'upload',
    };
  }

  throw new Error('Either file_path, url, or base64 must be provided');
}
