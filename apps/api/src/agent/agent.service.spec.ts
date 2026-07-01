import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Book } from '@prisma/client';
import { AgentService } from './agent.service';
import { createMockPrisma } from '../common/test-utils/mock-prisma';

type MockPrisma = ReturnType<typeof createMockPrisma>;

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'b-1',
    userId: 'u-1',
    childProfileId: null,
    status: 'created' as Book['status'],
    request: null,
    title: null,
    dedicationText: null,
    pageCount: null,
    childName: 'Mia',
    childAge: 5,
    language: 'en' as Book['language'],
    theme: 'friendship',
    characterCard: null,
    storyPlan: null,
    bookPreview: null,
    imageGenerationResult: null,
    chapters: null,
    imagePrompts: null,
    qualityReport: null,
    pageLayouts: null,
    coverUrl: null,
    pdfR2Key: null,
    pdfUrl: null,
    printPdfR2Key: null,
    printPdfUrl: null,
    previewPdfR2Key: null,
    previewPdfUrl: null,
    socialCardUrl: null,
    isPaid: false,
    paidAt: null,
    stripePaymentIntentId: null,
    isPublic: false,
    generationTimeMs: null,
    totalCostUsd: null,
    aiModelVersions: null,
    generatedDegraded: false,
    errorMessage: null,
    retryCount: 0,
    failedStep: null,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('AgentService', () => {
  let service: AgentService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new AgentService(prisma as never);
  });

  describe('startBookGeneration', () => {
    function setupMocks(bookOverrides: Partial<Book> = {}) {
      const updatedBook = makeBook({ status: 'image_gen' as Book['status'], ...bookOverrides });
      prisma.book.update.mockResolvedValue(updatedBook);
      prisma.agentLog.createMany.mockResolvedValue({ count: 7 });
      return updatedBook;
    }

    it('advances book status to image_gen', async () => {
      const book = makeBook();
      setupMocks();

      await service.startBookGeneration(book);

      expect(prisma.book.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'b-1' },
          data: expect.objectContaining({ status: 'image_gen' }),
        }),
      );
    });

    it('returns the updated book', async () => {
      const book = makeBook();
      const updatedBook = setupMocks();

      const result = await service.startBookGeneration(book);

      expect(result).toBe(updatedBook);
    });

    it('stores a characterCard derived from the book fields', async () => {
      const book = makeBook({ childName: 'Mia', childAge: 5 });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const card = updateArg?.data?.characterCard as Record<string, unknown>;
      expect(card).toBeDefined();
      expect(card?.name).toBe('Mia');
      expect(card?.age).toBe(5);
      expect(typeof card?.visualAnchor).toBe('string');
    });

    it('stores a storyPlan derived from the book fields', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const plan = updateArg?.data?.storyPlan as Record<string, unknown>;
      expect(plan).toBeDefined();
      expect(plan?.theme).toBe('friendship');
      expect(Array.isArray(plan?.chapters)).toBe(true);
      expect((plan?.chapters as unknown[]).length).toBe(3);
    });

    it('stores storyPlan.pages with 2 pages per chapter', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const plan = updateArg?.data?.storyPlan as Record<string, unknown>;
      const chapters = plan?.chapters as unknown[];
      const pages = plan?.pages as Array<Record<string, unknown>>;
      expect(Array.isArray(pages)).toBe(true);
      expect(pages.length).toBe(chapters.length * 2);
    });

    it('assigns globally incrementing pageNumbers starting from 1', async () => {
      const book = makeBook();
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const plan = updateArg?.data?.storyPlan as Record<string, unknown>;
      const pages = plan?.pages as Array<Record<string, unknown>>;
      const pageNumbers = pages.map((p) => p.pageNumber as number);
      expect(pageNumbers[0]).toBe(1);
      for (let i = 1; i < pageNumbers.length; i++) {
        expect(pageNumbers[i]).toBe(pageNumbers[i - 1]! + 1);
      }
    });

    it('sets chapterIndex to the chapter position', async () => {
      const book = makeBook();
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const plan = updateArg?.data?.storyPlan as Record<string, unknown>;
      const pages = plan?.pages as Array<Record<string, unknown>>;
      // pages 0 and 1 → chapterIndex 0; pages 2 and 3 → chapterIndex 1; etc.
      expect(pages[0]?.chapterIndex).toBe(0);
      expect(pages[1]?.chapterIndex).toBe(0);
      expect(pages[2]?.chapterIndex).toBe(1);
      expect(pages[3]?.chapterIndex).toBe(1);
    });

    it('each page includes required fields', async () => {
      const book = makeBook();
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const plan = updateArg?.data?.storyPlan as Record<string, unknown>;
      const pages = plan?.pages as Array<Record<string, unknown>>;
      for (const page of pages) {
        expect(typeof page.pageNumber).toBe('number');
        expect(typeof page.chapterIndex).toBe('number');
        expect(typeof page.title).toBe('string');
        expect(typeof page.sceneDescription).toBe('string');
        expect(typeof page.narration).toBe('string');
        expect(typeof page.illustrationPrompt).toBe('string');
        expect(typeof page.learningGoal).toBe('string');
      }
    });

    it('stores storyText on every page and it is non-empty', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const plan = updateArg?.data?.storyPlan as Record<string, unknown>;
      const pages = plan?.pages as Array<Record<string, unknown>>;
      for (const page of pages) {
        expect(typeof page.storyText).toBe('string');
        expect((page.storyText as string).length).toBeGreaterThan(0);
      }
    });

    it('sets book title from the generated story plan', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      expect(typeof updateArg?.data?.title).toBe('string');
      expect(updateArg?.data?.title).toContain('Mia');
    });

    it('writes seven AgentLog records all sharing the same traceId', async () => {
      const book = makeBook();
      setupMocks();

      await service.startBookGeneration(book);

      expect(prisma.agentLog.createMany).toHaveBeenCalledOnce();
      const createManyArg = prisma.agentLog.createMany.mock.calls[0]?.[0];
      const entries = createManyArg?.data as Array<Record<string, unknown>>;
      expect(entries).toHaveLength(7);
      expect(entries[0]?.step).toBe('char_build');
      expect(entries[1]?.step).toBe('story_plan');
      expect(entries[2]?.step).toBe('page_plan');
      expect(entries[3]?.step).toBe('story_draft');
      expect(entries[4]?.step).toBe('illust_plan');
      expect(entries[5]?.step).toBe('preview_ready');
      expect(entries[6]?.step).toBe('image_gen');
      const traceId = entries[0]?.traceId;
      expect(typeof traceId).toBe('string');
      for (const entry of entries) {
        expect(entry.traceId).toBe(traceId);
      }
    });

    it('stores illustration on every page', async () => {
      const book = makeBook();
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const plan = updateArg?.data?.storyPlan as Record<string, unknown>;
      const pages = plan?.pages as Array<Record<string, unknown>>;
      for (const page of pages) {
        expect(page.illustration).toBeDefined();
        expect(page.illustration).not.toBeNull();
      }
    });

    it('each page illustration has a non-empty prompt and negativePrompt', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const plan = updateArg?.data?.storyPlan as Record<string, unknown>;
      const pages = plan?.pages as Array<Record<string, unknown>>;
      for (const page of pages) {
        const illust = page.illustration as Record<string, unknown>;
        expect(typeof illust.prompt).toBe('string');
        expect((illust.prompt as string).length).toBeGreaterThan(0);
        expect(typeof illust.negativePrompt).toBe('string');
        expect((illust.negativePrompt as string).length).toBeGreaterThan(0);
      }
    });

    it('illustration style is stable across all pages', async () => {
      const book = makeBook();
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const plan = updateArg?.data?.storyPlan as Record<string, unknown>;
      const pages = plan?.pages as Array<Record<string, unknown>>;
      const styles = pages.map((p) => (p.illustration as Record<string, unknown>).style);
      const firstStyle = styles[0];
      for (const s of styles) {
        expect(s).toBe(firstStyle);
      }
    });

    it('illustration aspectRatio is stable across all pages', async () => {
      const book = makeBook();
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const plan = updateArg?.data?.storyPlan as Record<string, unknown>;
      const pages = plan?.pages as Array<Record<string, unknown>>;
      const ratios = pages.map((p) => (p.illustration as Record<string, unknown>).aspectRatio);
      const firstRatio = ratios[0];
      for (const r of ratios) {
        expect(r).toBe(firstRatio);
      }
    });

    it('uses book.childName and theme for deterministic output', async () => {
      const book = makeBook({ childName: 'Leo', theme: 'courage' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const card = updateArg?.data?.characterCard as Record<string, unknown>;
      const plan = updateArg?.data?.storyPlan as Record<string, unknown>;
      expect(card?.name).toBe('Leo');
      expect(plan?.theme).toBe('courage');
    });

    it('stores bookPreview with a non-empty title', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const preview = updateArg?.data?.bookPreview as Record<string, unknown>;
      expect(preview).toBeDefined();
      expect(typeof preview?.title).toBe('string');
      expect((preview?.title as string).length).toBeGreaterThan(0);
    });

    it('stores bookPreview with a cover', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const preview = updateArg?.data?.bookPreview as Record<string, unknown>;
      expect(preview?.cover).toBeDefined();
      const cover = preview?.cover as Record<string, unknown>;
      expect(typeof cover?.title).toBe('string');
      expect(typeof cover?.illustrationPrompt).toBe('string');
      expect(cover?.childName).toBe('Mia');
    });

    it('bookPreview.pages length equals storyPlan.pages length', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const plan = updateArg?.data?.storyPlan as Record<string, unknown>;
      const preview = updateArg?.data?.bookPreview as Record<string, unknown>;
      const storyPages = plan?.pages as unknown[];
      const previewPages = preview?.pages as unknown[];
      expect(previewPages.length).toBe(storyPages.length);
    });

    it('every preview page has text and illustrationPrompt', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const preview = updateArg?.data?.bookPreview as Record<string, unknown>;
      const pages = preview?.pages as Array<Record<string, unknown>>;
      for (const page of pages) {
        expect(typeof page.text).toBe('string');
        expect((page.text as string).length).toBeGreaterThan(0);
        expect(typeof page.illustrationPrompt).toBe('string');
        expect((page.illustrationPrompt as string).length).toBeGreaterThan(0);
      }
    });

    it('bookPreview.metadata.totalPages equals bookPreview.pages.length', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const preview = updateArg?.data?.bookPreview as Record<string, unknown>;
      const pages = preview?.pages as unknown[];
      const metadata = preview?.metadata as Record<string, unknown>;
      expect(metadata?.totalPages).toBe(pages.length);
    });

    it('storyText remains present on every page after buildBookPreview', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const plan = updateArg?.data?.storyPlan as Record<string, unknown>;
      const pages = plan?.pages as Array<Record<string, unknown>>;
      for (const page of pages) {
        expect(typeof page.storyText).toBe('string');
        expect((page.storyText as string).length).toBeGreaterThan(0);
      }
    });

    it('illustration remains present on every page after buildBookPreview', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const plan = updateArg?.data?.storyPlan as Record<string, unknown>;
      const pages = plan?.pages as Array<Record<string, unknown>>;
      for (const page of pages) {
        expect(page.illustration).toBeDefined();
        expect(page.illustration).not.toBeNull();
      }
    });

    // ── Phase 2G: Image generation result ────────────────────────────────────

    it('stores imageGenerationResult in the book update', async () => {
      const book = makeBook();
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const result = updateArg?.data?.imageGenerationResult as Record<string, unknown>;
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
    });

    it('imageGenerationResult provider is local_mock', async () => {
      const book = makeBook();
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const result = updateArg?.data?.imageGenerationResult as Record<string, unknown>;
      expect(result.provider).toBe('local_mock');
      expect(result.status).toBe('complete');
    });

    it('imageGenerationResult includes a cover image', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const result = updateArg?.data?.imageGenerationResult as Record<string, unknown>;
      const images = result.images as Array<Record<string, unknown>>;
      const coverImage = images.find((img) => img.kind === 'cover');
      expect(coverImage).toBeDefined();
      expect(coverImage?.imageUrl).toBe('/mock-images/b-1/cover.svg');
      expect(typeof coverImage?.altText).toBe('string');
    });

    it('imageGenerationResult includes one image per preview page', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const preview = updateArg?.data?.bookPreview as Record<string, unknown>;
      const result = updateArg?.data?.imageGenerationResult as Record<string, unknown>;
      const previewPages = preview.pages as unknown[];
      const images = result.images as Array<Record<string, unknown>>;
      const pageImages = images.filter((img) => img.kind === 'page');
      expect(pageImages.length).toBe(previewPages.length);
    });

    it('imageGenerationResult includes a back cover image', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const result = updateArg?.data?.imageGenerationResult as Record<string, unknown>;
      const images = result.images as Array<Record<string, unknown>>;
      const backCoverImage = images.find((img) => img.kind === 'back_cover');
      expect(backCoverImage).toBeDefined();
      expect(backCoverImage?.imageUrl).toBe('/mock-images/b-1/back-cover.svg');
    });

    it('image URLs are deterministic and stable across runs for the same bookId', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const result = updateArg?.data?.imageGenerationResult as Record<string, unknown>;
      const images = result.images as Array<Record<string, unknown>>;
      for (const img of images) {
        expect((img.imageUrl as string).startsWith('/mock-images/b-1/')).toBe(true);
      }
    });

    it('page image URLs embed the page number', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const result = updateArg?.data?.imageGenerationResult as Record<string, unknown>;
      const images = result.images as Array<Record<string, unknown>>;
      const pageImages = images.filter((img) => img.kind === 'page') as Array<Record<string, unknown>>;
      for (const img of pageImages) {
        const pageNum = img.pageNumber as number;
        expect(img.imageUrl).toBe(`/mock-images/b-1/page-${pageNum}.svg`);
      }
    });

    it('image seeds are stable and derived from bookId', async () => {
      const book = makeBook();
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const result = updateArg?.data?.imageGenerationResult as Record<string, unknown>;
      const images = result.images as Array<Record<string, unknown>>;
      for (const img of images) {
        expect((img.seed as string).startsWith('b-1:')).toBe(true);
      }
    });

    it('imageGenerationResult is deterministic for the same input', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      prisma.book.update.mockClear();
      prisma.agentLog.createMany.mockClear();
      setupMocks();

      await service.startBookGeneration(book);

      const firstArg = prisma.book.update.mock.calls[0]?.[0];
      const firstResult = firstArg?.data?.imageGenerationResult as Record<string, unknown>;
      expect(firstResult.provider).toBe('local_mock');
      expect(firstResult.status).toBe('complete');
    });

    it('bookPreview is still stored alongside imageGenerationResult', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      const preview = updateArg?.data?.bookPreview as Record<string, unknown>;
      expect(preview).toBeDefined();
      expect(typeof preview?.title).toBe('string');
    });
  });
});
