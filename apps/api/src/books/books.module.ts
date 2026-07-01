import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AgentService } from '../agent/agent.service';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
  imports: [AuthModule],
  controllers: [BooksController],
  providers: [BooksService, AgentService],
})
export class BooksModule {}
