import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const TMP_ROOT = resolve(__dirname, '..', '..', 'tmp');

export interface PdfStorage {
  savePreviewPdf(bookId: string, buffer: Buffer): Promise<{ url: string; path?: string }>;
}

export const PDF_STORAGE_TOKEN = 'PDF_STORAGE';

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
    if (!/^[\w-]+$/.test(bookId)) {
      throw new Error(`Invalid bookId for PDF storage: "${bookId}"`);
    }
    const dir = join(TMP_ROOT, 'books', bookId);
    await mkdir(dir, { recursive: true });
    const path = join(dir, 'storybook.pdf');
    await writeFile(path, buffer);
    return { url: `/files/books/${bookId}/storybook.pdf`, path };
  }
}

/**
 * Returns the configured PdfStorage implementation.
 * Supported drivers: local (default).
 * S3/R2 drivers are not yet implemented — set PDF_STORAGE_DRIVER=local or omit the variable.
 */
export function createPdfStorage(driver = 'local'): PdfStorage {
  if (driver === 'local') return new LocalPdfStorage();
  throw new Error(
    `PDF_STORAGE_DRIVER "${driver}" is not implemented yet. Supported drivers: local`,
  );
}
