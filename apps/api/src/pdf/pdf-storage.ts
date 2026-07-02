import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const TMP_ROOT = resolve(__dirname, '..', '..', 'tmp');

/**
 * Writes a PDF buffer for a book to local disk.
 *
 * Output path: <api-root>/tmp/books/<bookId>/storybook.pdf
 * Served at:   /files/books/<bookId>/storybook.pdf
 *
 * Designed to be replaced later with an S3/R2 adapter by swapping this module.
 */
export async function saveBookPdf(
  bookId: string,
  buffer: Buffer,
): Promise<{ pdfPath: string; pdfUrl: string }> {
  if (!/^[\w-]+$/.test(bookId)) {
    throw new Error(`Invalid bookId for PDF storage: "${bookId}"`);
  }
  const dir = join(TMP_ROOT, 'books', bookId);
  await mkdir(dir, { recursive: true });
  const pdfPath = join(dir, 'storybook.pdf');
  await writeFile(pdfPath, buffer);
  return { pdfPath, pdfUrl: `/files/books/${bookId}/storybook.pdf` };
}
