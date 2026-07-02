import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { rm } from 'node:fs/promises';
import { LocalPdfStorage, createPdfStorage } from './pdf-storage';

const TEST_BOOK_ID = 'test-pdf-storage-spec-001';
const TEST_DIR = resolve(process.cwd(), 'tmp', 'books', TEST_BOOK_ID);

describe('LocalPdfStorage', () => {
  let storage: LocalPdfStorage;

  beforeEach(() => {
    storage = new LocalPdfStorage();
  });

  afterEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
  });

  it('creates the output directory and writes a file', async () => {
    const buffer = Buffer.from('%PDF-1.4 test');
    const result = await storage.savePreviewPdf(TEST_BOOK_ID, buffer);
    expect(result.path).toBeDefined();
    expect(existsSync(result.path!)).toBe(true);
  });

  it('written file is non-empty', async () => {
    const buffer = Buffer.from('%PDF-1.4 test content');
    const result = await storage.savePreviewPdf(TEST_BOOK_ID, buffer);
    const written = await readFile(result.path!);
    expect(written.length).toBeGreaterThan(0);
  });

  it('written file bytes match the input buffer exactly', async () => {
    const buffer = Buffer.from('%PDF-1.4 exact match test');
    const result = await storage.savePreviewPdf(TEST_BOOK_ID, buffer);
    const written = await readFile(result.path!);
    expect(written.equals(buffer)).toBe(true);
  });

  it('returns the correct url for the bookId', async () => {
    const result = await storage.savePreviewPdf(TEST_BOOK_ID, Buffer.from('%PDF'));
    expect(result.url).toBe(`/files/books/${TEST_BOOK_ID}/storybook.pdf`);
  });

  it('path ends with storybook.pdf', async () => {
    const result = await storage.savePreviewPdf(TEST_BOOK_ID, Buffer.from('%PDF'));
    expect(result.path).toMatch(/storybook\.pdf$/);
  });

  it('is idempotent — overwrites an existing file without error', async () => {
    const first = Buffer.from('%PDF-first');
    const second = Buffer.from('%PDF-second');
    const result1 = await storage.savePreviewPdf(TEST_BOOK_ID, first);
    const result2 = await storage.savePreviewPdf(TEST_BOOK_ID, second);
    expect(result1.path).toBe(result2.path);
    const written = await readFile(result2.path!);
    expect(written.equals(second)).toBe(true);
  });

  it('rejects for bookIds containing path-traversal characters', async () => {
    await expect(storage.savePreviewPdf('../evil', Buffer.from('%PDF'))).rejects.toThrow();
    await expect(storage.savePreviewPdf('foo/bar', Buffer.from('%PDF'))).rejects.toThrow();
  });

  it('accepts valid UUID-style bookIds', async () => {
    const uuidId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const dir = resolve(process.cwd(), 'tmp', 'books', uuidId);
    try {
      const result = await storage.savePreviewPdf(uuidId, Buffer.from('%PDF'));
      expect(result.url).toBe(`/files/books/${uuidId}/storybook.pdf`);
    } finally {
      if (existsSync(dir)) {
        await rm(dir, { recursive: true });
      }
    }
  });
});

describe('LocalPdfStorage.getPreviewPdf', () => {
  let storage: LocalPdfStorage;

  beforeEach(() => {
    storage = new LocalPdfStorage();
  });

  afterEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
  });

  it('returns null when the file does not exist', async () => {
    const result = await storage.getPreviewPdf(TEST_BOOK_ID);
    expect(result).toBeNull();
  });

  it('returns a buffer matching the saved PDF after a save', async () => {
    const buffer = Buffer.from('%PDF-1.4 read-back test');
    await storage.savePreviewPdf(TEST_BOOK_ID, buffer);
    const result = await storage.getPreviewPdf(TEST_BOOK_ID);
    expect(result).not.toBeNull();
    expect(result!.buffer.equals(buffer)).toBe(true);
  });

  it('returns contentType "application/pdf"', async () => {
    await storage.savePreviewPdf(TEST_BOOK_ID, Buffer.from('%PDF'));
    const result = await storage.getPreviewPdf(TEST_BOOK_ID);
    expect(result!.contentType).toBe('application/pdf');
  });

  it('returns filename storyme-preview-<bookId>.pdf', async () => {
    await storage.savePreviewPdf(TEST_BOOK_ID, Buffer.from('%PDF'));
    const result = await storage.getPreviewPdf(TEST_BOOK_ID);
    expect(result!.filename).toBe(`storyme-preview-${TEST_BOOK_ID}.pdf`);
  });

  it('rejects for bookIds containing path-traversal characters', async () => {
    await expect(storage.getPreviewPdf('../evil')).rejects.toThrow();
    await expect(storage.getPreviewPdf('foo/bar')).rejects.toThrow();
  });
});

describe('createPdfStorage', () => {
  it('defaults to local driver when no argument is passed', () => {
    const storage = createPdfStorage();
    expect(storage).toBeInstanceOf(LocalPdfStorage);
  });

  it('returns LocalPdfStorage when driver is "local"', () => {
    const storage = createPdfStorage('local');
    expect(storage).toBeInstanceOf(LocalPdfStorage);
  });

  it('throws a clear "not implemented" error for unsupported drivers', () => {
    expect(() => createPdfStorage('s3')).toThrow(/not implemented yet/);
    expect(() => createPdfStorage('r2')).toThrow(/not implemented yet/);
  });

  it('error message names the unsupported driver', () => {
    expect(() => createPdfStorage('gcs')).toThrow(/gcs/);
  });
});
