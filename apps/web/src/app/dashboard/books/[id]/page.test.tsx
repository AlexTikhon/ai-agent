import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useParams } from 'next/navigation';
import BookDetailPage from './page';
import { SupportedLanguage, BookStatus } from '@book/types';
import type { BookDto } from '@book/types';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock('next/link', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_BOOK: BookDto = {
  id: 'book-1',
  userId: 'user-1',
  title: "Emma's Story",
  childName: 'Emma',
  childAge: 5,
  language: SupportedLanguage.English,
  theme: 'Friendship',
  status: BookStatus.Created,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

function mockOk(body: unknown, status = 200): Response {
  return { ok: true, status, json: async () => body } as unknown as Response;
}

function mockError(status: number, message: string): Response {
  return { ok: false, status, json: async () => ({ message }) } as unknown as Response;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BookDetailPage', () => {
  const pushMock = vi.fn();

  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({ id: 'book-1' });
    vi.mocked(useRouter).mockReturnValue({ push: pushMock } as unknown as ReturnType<typeof useRouter>);
    vi.stubGlobal('fetch', vi.fn());
    pushMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Loading state ──────────────────────────────────────────────────────────

  it('shows a loading skeleton while the book is being fetched', () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockOk(MOCK_BOOK));
    render(<BookDetailPage />);
    expect(screen.getByRole('status', { name: /loading book/i })).toBeDefined();
  });

  // ── Successful render ──────────────────────────────────────────────────────

  it('renders book details after a successful fetch', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockOk(MOCK_BOOK));
    render(<BookDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: "Emma's Story" })).toBeDefined();
      expect(screen.getByText('Emma, age 5')).toBeDefined();
      expect(screen.getByText('Friendship')).toBeDefined();
    });
  });

  // ── Error / not found states ───────────────────────────────────────────────

  it('renders an error banner when the API returns a server error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockError(500, 'Internal server error'));
    render(<BookDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Internal server error');
    });
  });

  it('renders a not-found state when the API returns 404', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockError(404, 'Book not found'));
    render(<BookDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /book not found/i })).toBeDefined();
    });
  });

  // ── Edit mode ─────────────────────────────────────────────────────────────

  it('shows validation error when saving with an empty child name', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(mockOk(MOCK_BOOK));
    render(<BookDetailPage />);

    await waitFor(() => screen.getByRole('heading', { level: 1, name: "Emma's Story" }));
    await user.click(screen.getByRole('button', { name: /^edit$/i }));

    const nameInput = screen.getByPlaceholderText(/e\.g\. emma/i);
    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(screen.getByRole('alert').textContent).toContain('required');
  });

  // ── Successful PATCH save ──────────────────────────────────────────────────

  it('saves edits and returns to view mode on successful PATCH', async () => {
    const user = userEvent.setup();
    const updated = { ...MOCK_BOOK, theme: 'Adventure' };
    vi.mocked(fetch)
      .mockResolvedValueOnce(mockOk(MOCK_BOOK))   // initial GET
      .mockResolvedValueOnce(mockOk(updated));      // PATCH

    render(<BookDetailPage />);
    await waitFor(() => screen.getByRole('heading', { level: 1, name: "Emma's Story" }));

    await user.click(screen.getByRole('button', { name: /^edit$/i }));

    const themeInput = screen.getByPlaceholderText(/friendship/i);
    await user.clear(themeInput);
    await user.type(themeInput, 'Adventure');

    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /edit book/i })).toBeNull();
      expect(screen.getByText('Adventure')).toBeDefined();
    });
  });

  // ── Delete ────────────────────────────────────────────────────────────────

  it('deletes the book and redirects to /dashboard', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    vi.mocked(fetch)
      .mockResolvedValueOnce(mockOk(MOCK_BOOK))
      .mockResolvedValueOnce({ ok: true, status: 204 } as Response);

    render(<BookDetailPage />);
    await waitFor(() => screen.getByRole('heading', { level: 1, name: "Emma's Story" }));

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });
});
