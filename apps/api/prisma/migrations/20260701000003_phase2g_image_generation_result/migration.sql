-- AlterTable: add image_generation_result column to books
ALTER TABLE "books" ADD COLUMN "image_generation_result" JSONB;
