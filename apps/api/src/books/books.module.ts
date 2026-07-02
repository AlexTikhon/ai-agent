import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AgentService } from '../agent/agent.service';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { createPdfStorage, PDF_STORAGE_TOKEN } from '../pdf/pdf-storage';

@Module({
  imports: [AuthModule],
  controllers: [BooksController],
  providers: [
    {
      provide: PDF_STORAGE_TOKEN,
      useFactory: () => createPdfStorage(process.env['PDF_STORAGE_DRIVER']),
    },
    BooksService,
    AgentService,
  ],
})
export class BooksModule {}
