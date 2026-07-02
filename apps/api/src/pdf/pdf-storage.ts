import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const TMP_ROOT = resolve(__dirname, '..', '..', 'tmp');

/**
 * Storage boundary for generated PDF previews. Every driver (local disk today;
 * S3/R2 later) implements this contract so callers (BooksService, controllers)
 * never branch on which backend is active.
 */
export interface PdfStorage {
  savePreviewPdf(bookId: string, buffer: Buffer): Promise<{ url: string; path?: string }>;
  getPreviewPdf(bookId: string): Promise<{
    buffer: Buffer;
    contentType: 'application/pdf';
    filename: string;
  } | null>;
  /** Cheap existence check that avoids reading the file into memory. */
  previewPdfExists(bookId: string): Promise<boolean>;
}

export const PDF_STORAGE_TOKEN = 'PDF_STORAGE';

/** bookId is embedded directly into filesystem paths, so it must never contain path separators or traversal sequences. */
function validateBookId(bookId: string): void {
  if (!/^[\w-]+$/.test(bookId)) {
    throw new Error(`Invalid bookId for PDF storage: "${bookId}"`);
  }
}

/**
 * Local filesystem implementation.
 * Output path: <api-root>/tmp/books/<bookId>/storybook.pdf
 * Served at:   /files/books/<bookId>/storybook.pdf
 */
export class LocalPdfStorage implements PdfStorage {
  async savePreviewPdf(
    bookId: string,
    buffer: Buffer,
  ): Promise<{ url: string; path?: string }> {
    validateBookId(bookId);
    const dir = join(TMP_ROOT, 'books', bookId);
    await mkdir(dir, { recursive: true });
    const path = join(dir, 'storybook.pdf');
    await writeFile(path, buffer);
    return { url: `/files/books/${bookId}/storybook.pdf`, path };
  }

  async getPreviewPdf(bookId: string): Promise<{
    buffer: Buffer;
    contentType: 'application/pdf';
    filename: string;
  } | null> {
    validateBookId(bookId);
    const path = join(TMP_ROOT, 'books', bookId, 'storybook.pdf');
    if (!existsSync(path)) return null;
    const buffer = await readFile(path);
    return { buffer, contentType: 'application/pdf', filename: `storyme-preview-${bookId}.pdf` };
  }

  async previewPdfExists(bookId: string): Promise<boolean> {
    validateBookId(bookId);
    const path = join(TMP_ROOT, 'books', bookId, 'storybook.pdf');
    return existsSync(path);
  }
}

/**
 * Scaffold for a future S3/R2-backed driver. Constructing it is safe (no network
 * calls); every operation throws until the real upload/download logic lands.
 * Not wired into {@link createPdfStorage} yet — kept separate so introducing the
 * real implementation later only touches this class.
 */
export class CloudPdfStorage implements PdfStorage {
  constructor(private readonly driver: 's3' | 'r2') {}

  private notImplemented(): never {
    throw new Error(`CloudPdfStorage driver "${this.driver}" is not implemented yet`);
  }

  async savePreviewPdf(): Promise<{ url: string; path?: string }> {
    this.notImplemented();
  }

  async getPreviewPdf(): Promise<{
    buffer: Buffer;
    contentType: 'application/pdf';
    filename: string;
  } | null> {
    this.notImplemented();
  }

  async previewPdfExists(): Promise<boolean> {
    this.notImplemented();
  }
}

/**
 * Returns the configured PdfStorage implementation.
 * Supported drivers: local (default).
 * S3/R2 drivers are recognized but not yet implemented — set PDF_STORAGE_DRIVER=local
 * or omit the variable. See {@link CloudPdfStorage} for the future scaffold.
 */
export function createPdfStorage(driver = 'local'): PdfStorage {
  if (driver === 'local') return new LocalPdfStorage();
  throw new Error(
    `PDF_STORAGE_DRIVER "${driver}" is not implemented yet. Supported drivers: local`,
  );
}
