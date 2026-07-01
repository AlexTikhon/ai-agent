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
      const updatedBook = makeBook({ status: 'story_plan' as Book['status'], ...bookOverrides });
      prisma.book.update.mockResolvedValue(updatedBook);
      prisma.agentLog.createMany.mockResolvedValue({ count: 2 });
      return updatedBook;
    }

    it('advances book status to story_plan', async () => {
      const book = makeBook();
      setupMocks();

      await service.startBookGeneration(book);

      expect(prisma.book.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'b-1' },
          data: expect.objectContaining({ status: 'story_plan' }),
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

    it('sets book title from the generated story plan', async () => {
      const book = makeBook({ childName: 'Mia', theme: 'friendship' });
      setupMocks();

      await service.startBookGeneration(book);

      const updateArg = prisma.book.update.mock.calls[0]?.[0];
      expect(typeof updateArg?.data?.title).toBe('string');
      expect(updateArg?.data?.title).toContain('Mia');
    });

    it('writes two AgentLog records with the same traceId', async () => {
      const book = makeBook();
      setupMocks();

      await service.startBookGeneration(book);

      expect(prisma.agentLog.createMany).toHaveBeenCalledOnce();
      const createManyArg = prisma.agentLog.createMany.mock.calls[0]?.[0];
      const entries = createManyArg?.data as Array<Record<string, unknown>>;
      expect(entries).toHaveLength(2);
      expect(entries[0]?.step).toBe('char_build');
      expect(entries[1]?.step).toBe('story_plan');
      expect(entries[0]?.traceId).toBe(entries[1]?.traceId);
      expect(typeof entries[0]?.traceId).toBe('string');
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
  });
});
