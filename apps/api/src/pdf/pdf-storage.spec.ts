import { describe, it, expect, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { rm } from 'node:fs/promises';
import { saveBookPdf } from './pdf-storage';

const TEST_BOOK_ID = 'test-pdf-storage-spec-001';
const TEST_DIR = resolve(process.cwd(), 'tmp', 'books', TEST_BOOK_ID);

describe('saveBookPdf', () => {
  afterEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
  });

  it('creates the output directory and writes a file', async () => {
    const buffer = Buffer.from('%PDF-1.4 test');
    const result = await saveBookPdf(TEST_BOOK_ID, buffer);
    expect(existsSync(result.pdfPath)).toBe(true);
  });

  it('written file is non-empty', async () => {
    const buffer = Buffer.from('%PDF-1.4 test content');
    const result = await saveBookPdf(TEST_BOOK_ID, buffer);
    const written = await readFile(result.pdfPath);
    expect(written.length).toBeGreaterThan(0);
  });

  it('written file bytes match the input buffer exactly', async () => {
    const buffer = Buffer.from('%PDF-1.4 exact match test');
    const result = await saveBookPdf(TEST_BOOK_ID, buffer);
    const written = await readFile(result.pdfPath);
    expect(written.equals(buffer)).toBe(true);
  });

  it('returns the correct pdfUrl for the bookId', async () => {
    const result = await saveBookPdf(TEST_BOOK_ID, Buffer.from('%PDF'));
    expect(result.pdfUrl).toBe(`/files/books/${TEST_BOOK_ID}/storybook.pdf`);
  });

  it('pdfPath ends with storybook.pdf', async () => {
    const result = await saveBookPdf(TEST_BOOK_ID, Buffer.from('%PDF'));
    expect(result.pdfPath).toMatch(/storybook\.pdf$/);
  });

  it('is idempotent — overwrites an existing file without error', async () => {
    const first = Buffer.from('%PDF-first');
    const second = Buffer.from('%PDF-second');
    const result1 = await saveBookPdf(TEST_BOOK_ID, first);
    const result2 = await saveBookPdf(TEST_BOOK_ID, second);
    expect(result1.pdfPath).toBe(result2.pdfPath);
    const written = await readFile(result2.pdfPath);
    expect(written.equals(second)).toBe(true);
  });

  it('rejects for bookIds containing path-traversal characters', async () => {
    await expect(saveBookPdf('../evil', Buffer.from('%PDF'))).rejects.toThrow();
    await expect(saveBookPdf('foo/bar', Buffer.from('%PDF'))).rejects.toThrow();
  });

  it('accepts valid UUID-style bookIds', async () => {
    const uuidId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const dir = resolve(process.cwd(), 'tmp', 'books', uuidId);
    try {
      const result = await saveBookPdf(uuidId, Buffer.from('%PDF'));
      expect(result.pdfUrl).toBe(`/files/books/${uuidId}/storybook.pdf`);
    } finally {
      if (existsSync(dir)) {
        await rm(dir, { recursive: true });
      }
    }
  });
});
