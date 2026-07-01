-- AlterEnum: add preview_ready to AgentStep
ALTER TYPE "AgentStep" ADD VALUE 'preview_ready';

-- AlterEnum: add preview_ready to BookStatus
ALTER TYPE "BookStatus" ADD VALUE 'preview_ready';

-- AlterTable: add book_preview column to books
ALTER TABLE "books" ADD COLUMN "book_preview" JSONB;
