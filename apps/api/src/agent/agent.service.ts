import { Injectable } from '@nestjs/common';
import { AgentLogStatus, AgentStep, BookStatus, type Book } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AgentService {
  constructor(private readonly prisma: PrismaService) {}

  /** Stub: transitions book to char_build status and writes an AgentLog entry. */
  async startBookGeneration(book: Book): Promise<Book> {
    const traceId = randomUUID();

    const updated = await this.prisma.book.update({
      where: { id: book.id },
      data: { status: BookStatus.char_build },
    });

    await this.prisma.agentLog.create({
      data: {
        bookId: book.id,
        agent: 'StubPipelineAgent',
        step: AgentStep.char_build,
        status: AgentLogStatus.success,
        attempt: 1,
        traceId,
      },
    });

    return updated;
  }
}
