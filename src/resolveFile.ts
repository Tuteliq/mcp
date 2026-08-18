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
 *
 * EXACTLY ONE of file_path, url or base64 must be provided.
 *
 * This previously returned on the first source it found, so a caller supplying
 * two silently had the others discarded. An agent hedging with both `url` and
 * `base64` received a confident analysis of one file and no indication the
 * other was ignored; where the two differed, the answer was about the wrong
 * file. A silent wrong answer is worse than a loud failure, so supplying more
 * than one source is now an error that names what was received.
 */
export async function resolveFile(input: ResolveFileInput): Promise<ResolvedFile> {
  const supplied = (['file_path', 'url', 'base64'] as const).filter((k) => {
    const v = input[k];
    return typeof v === 'string' && v.trim() !== '';
  });

  if (supplied.length === 0) {
    throw new Error(
      'No file source provided. Supply exactly one of file_path, url or base64.',
    );
  }
  if (supplied.length > 1) {
    throw new Error(
      `Ambiguous file source: received ${supplied.join(' and ')}. `
      + 'Supply exactly one of file_path, url or base64, so it is unambiguous which file is analysed.',
    );
  }

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

  // Unreachable: the guard above proves exactly one source is present.
  throw new Error('No file source provided. Supply exactly one of file_path, url or base64.');
}
