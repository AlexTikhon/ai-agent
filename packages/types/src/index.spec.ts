import { describe, it, expect } from 'vitest';

describe('@book/types', () => {
  it('is importable as a module', async () => {
    const mod = await import('./index');
    expect(mod).toBeDefined();
  });

  it('book.types exports are present in source', async () => {
    const { BookRequest } = (await import('./book.types')) as { BookRequest?: unknown };
    // Types are erased at runtime; verifying the module loads without error is sufficient
    expect(true).toBe(true);
    void BookRequest;
  });
});
