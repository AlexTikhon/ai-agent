import { describe, it, expect, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import type { User } from '@prisma/client';
import { BooksController } from './books.controller';
import type { BooksService } from './books.service';

const FAKE_USER = { id: 'u-1' } as User;
const PDF_RESULT = {
  buffer: Buffer.from('%PDF-1.4 test content'),
  contentType: 'application/pdf' as const,
  filename: 'storyme-preview-b-1.pdf',
};

function createMockBooksService(): jest.Mocked<BooksService> {
  return {
    getPreviewPdfBuffer: vi.fn(),
  } as unknown as jest.Mocked<BooksService>;
}

function createMockResponse(): jest.Mocked<Response> {
  return { set: vi.fn() } as unknown as jest.Mocked<Response>;
}

describe('BooksController.getPreviewPdf', () => {
  it('sets Content-Type, Content-Disposition, and Content-Length headers from the service result', async () => {
    const booksService = createMockBooksService();
    booksService.getPreviewPdfBuffer.mockResolvedValue(PDF_RESULT);
    const controller = new BooksController(booksService);
    const res = createMockResponse();

    const result = await controller.getPreviewPdf(FAKE_USER, 'b-1', res);

    expect(res.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${PDF_RESULT.filename}"`,
      'Content-Length': String(PDF_RESULT.buffer.length),
    });
    expect(result.getStream().read()).toEqual(PDF_RESULT.buffer);
  });

  it('propagates NotFoundException from the service without swallowing it', async () => {
    const booksService = createMockBooksService();
    booksService.getPreviewPdfBuffer.mockRejectedValue(new NotFoundException('Book not found'));
    const controller = new BooksController(booksService);
    const res = createMockResponse();

    await expect(controller.getPreviewPdf(FAKE_USER, 'missing', res)).rejects.toThrow(
      NotFoundException,
    );
    expect(res.set).not.toHaveBeenCalled();
  });

  it('propagates ConflictException from the service when the PDF is not ready', async () => {
    const booksService = createMockBooksService();
    booksService.getPreviewPdfBuffer.mockRejectedValue(
      new ConflictException('PDF not ready — book generation is not complete'),
    );
    const controller = new BooksController(booksService);
    const res = createMockResponse();

    await expect(controller.getPreviewPdf(FAKE_USER, 'b-1', res)).rejects.toThrow(
      ConflictException,
    );
    expect(res.set).not.toHaveBeenCalled();
  });
});
