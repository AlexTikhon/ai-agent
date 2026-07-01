import type { Book } from '@prisma/client';
import { BookStatus, SupportedLanguage, type BookDto, type CharacterCard, type StoryPlan } from '@book/types';

export function toBookDto(book: Book): BookDto {
  return {
    id: book.id,
    userId: book.userId,
    title: book.title,
    childName: book.childName,
    childAge: book.childAge,
    language: book.language as unknown as SupportedLanguage | null,
    theme: book.theme,
    status: book.status as unknown as BookStatus,
    characterCard: book.characterCard as unknown as CharacterCard | null,
    storyPlan: book.storyPlan as unknown as StoryPlan | null,
    createdAt: book.createdAt.toISOString(),
    updatedAt: book.updatedAt.toISOString(),
  };
}
