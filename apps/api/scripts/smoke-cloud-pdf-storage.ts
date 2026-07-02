/**
 * Phase 2Q — Manual S3/R2 PDF storage smoke test
 *
 * Verifies CloudPdfStorage against a REAL AWS S3 or Cloudflare R2 bucket.
 * Never run in CI or automated tests — it requires live credentials and makes
 * real network calls.
 *
 * Usage:
 *   pnpm --filter @book/api smoke:pdf-storage
 *
 * Required env vars:
 *   PDF_STORAGE_DRIVER            "s3" or "r2"
 *   PDF_STORAGE_BUCKET
 *   PDF_STORAGE_REGION
 *   PDF_STORAGE_ACCESS_KEY_ID
 *   PDF_STORAGE_SECRET_ACCESS_KEY
 *   PDF_STORAGE_ENDPOINT          required for r2, optional for s3
 *   PDF_STORAGE_FORCE_PATH_STYLE  optional ("true"/"false")
 */
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createPdfStorage, objectKey, readCloudConfig } from '../src/pdf/pdf-storage';

const BOOK_ID = 'smoke-test-book';
const MISSING_BOOK_ID = 'smoke-test-book-does-not-exist';
const INVALID_BOOK_ID = '../evil';
const SAMPLE_PDF = Buffer.from('%PDF-1.4\n% StoryMe smoke test\n%%EOF\n');

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function assertRejects(promise: Promise<unknown>, message: string): Promise<void> {
  let threw = false;
  try {
    await promise;
  } catch {
    threw = true;
  }
  assert(threw, message);
}

async function main(): Promise<void> {
  const driver = process.env['PDF_STORAGE_DRIVER'];
  if (driver !== 's3' && driver !== 'r2') {
    throw new Error(
      `PDF_STORAGE_DRIVER must be "s3" or "r2" to run this smoke test (got: ${JSON.stringify(driver)}).`,
    );
  }

  console.log(`Running cloud PDF storage smoke test against driver "${driver}"...`);
  const storage = createPdfStorage(driver, process.env);

  console.log(`[1/6] savePreviewPdf("${BOOK_ID}")`);
  await storage.savePreviewPdf(BOOK_ID, SAMPLE_PDF);

  console.log('[2/6] previewPdfExists returns true for the saved book');
  assert(await storage.previewPdfExists(BOOK_ID), 'expected previewPdfExists to be true after save');

  console.log('[3/6] getPreviewPdf reads back matching metadata and content');
  const result = await storage.getPreviewPdf(BOOK_ID);
  assert(result !== null, 'expected getPreviewPdf to return a result');
  assert(result!.contentType === 'application/pdf', `expected contentType "application/pdf", got "${result!.contentType}"`);
  assert(
    result!.filename === `storyme-preview-${BOOK_ID}.pdf`,
    `expected filename "storyme-preview-${BOOK_ID}.pdf", got "${result!.filename}"`,
  );
  assert(result!.buffer.length > 0, 'expected non-empty buffer');

  console.log('[4/6] missing bookId returns false / null');
  assert(
    (await storage.previewPdfExists(MISSING_BOOK_ID)) === false,
    'expected previewPdfExists to be false for a missing bookId',
  );
  assert(
    (await storage.getPreviewPdf(MISSING_BOOK_ID)) === null,
    'expected getPreviewPdf to be null for a missing bookId',
  );

  console.log('[5/6] invalid/path-traversal bookId is rejected');
  await assertRejects(storage.previewPdfExists(INVALID_BOOK_ID), 'expected previewPdfExists to reject invalid bookId');
  await assertRejects(storage.getPreviewPdf(INVALID_BOOK_ID), 'expected getPreviewPdf to reject invalid bookId');
  await assertRejects(
    storage.savePreviewPdf(INVALID_BOOK_ID, SAMPLE_PDF),
    'expected savePreviewPdf to reject invalid bookId',
  );

  console.log('[6/6] cleaning up the smoke-test object');
  await cleanup(driver);

  console.log('\n✔ Cloud PDF storage smoke test passed — all checks succeeded.');
}

/** Deletes only the exact key this script created. Never touches other bucket data. */
async function cleanup(driver: 's3' | 'r2'): Promise<void> {
  const config = readCloudConfig(driver, process.env);
  const client = new S3Client({
    region: config.region,
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    forcePathStyle: config.forcePathStyle ?? Boolean(config.endpoint),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  await client.send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: objectKey(BOOK_ID) }),
  );
}

main().catch((err: unknown) => {
  console.error('\n✘ Cloud PDF storage smoke test FAILED:', err);
  process.exit(1);
});
