'use client';

import { useEffect, useState, useCallback, type FormEvent } from 'react';
import type { BookDto } from '@book/types';
import { SupportedLanguage, BookStatus } from '@book/types';
import { booksApi } from '@/lib/api/books';

// ── Constants ─────────────────────────────────────────────────────────────────

const LANGUAGES: { value: SupportedLanguage; label: string }[] = [
  { value: SupportedLanguage.English, label: 'English' },
  { value: SupportedLanguage.Russian, label: 'Russian' },
  { value: SupportedLanguage.Polish, label: 'Polish' },
];

interface DraftFormValues {
  childName: string;
  childAge: number;
  language: SupportedLanguage;
  theme: string;
}

const DEFAULT_FORM: DraftFormValues = {
  childName: '',
  childAge: 4,
  language: SupportedLanguage.English,
  theme: '',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [books, setBooks] = useState<BookDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<DraftFormValues>(DEFAULT_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<DraftFormValues>(DEFAULT_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadBooks = useCallback(async () => {
    setLoadError(null);
    try {
      setBooks(await booksApi.list());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load books');
    }
  }, []);

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const newBook = await booksApi.create({
        title: `${createForm.childName.trim()}'s Story`,
        ...createForm,
      });
      setBooks((prev) => (prev ? [newBook, ...prev] : [newBook]));
      setShowCreate(false);
      setCreateForm(DEFAULT_FORM);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create book');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (book: BookDto) => {
    setEditingId(book.id);
    setEditError(null);
    setEditForm({
      childName: book.childName ?? '',
      childAge: book.childAge ?? 4,
      language: book.language ?? SupportedLanguage.English,
      theme: book.theme ?? '',
    });
  };

  const handleUpdate = async (e: FormEvent, id: string) => {
    e.preventDefault();
    setSaving(true);
    setEditError(null);
    try {
      const updated = await booksApi.update(id, {
        title: `${editForm.childName.trim()}'s Story`,
        ...editForm,
      });
      setBooks((prev) => prev?.map((b) => (b.id === id ? updated : b)) ?? null);
      setEditingId(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update book');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this draft? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await booksApi.remove(id);
      setBooks((prev) => prev?.filter((b) => b.id !== id) ?? null);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete book');
    } finally {
      setDeletingId(null);
    }
  };

  const openCreate = () => {
    setShowCreate(true);
    setCreateForm(DEFAULT_FORM);
    setCreateError(null);
  };

  return (
    <main className="min-h-dvh bg-bg-base px-4 py-10">
      <div className="mx-auto max-w-container-lg">

        {/* ── Header ── */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-text-primary">My Book Drafts</h1>
            <p className="mt-1 text-sm text-text-muted">
              Signed in as{' '}
              <span className="font-medium text-text-secondary">dev@storyme.local</span>
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-brand transition-all hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"
          >
            <span aria-hidden="true">+</span> New Book
          </button>
        </div>

        {/* ── Create form ── */}
        {showCreate && (
          <div className="mb-8 rounded-2xl border border-border-default bg-bg-surface p-6 shadow-sm">
            <h2 className="mb-5 font-display text-xl font-semibold text-text-primary">
              New Book Draft
            </h2>
            <form onSubmit={(e) => { void handleCreate(e); }}>
              <DraftFormFields
                values={createForm}
                onChange={setCreateForm}
                error={createError}
                submitting={creating}
                submitLabel="Create Draft"
                onCancel={() => setShowCreate(false)}
              />
            </form>
          </div>
        )}

        {/* ── List states ── */}
        {books === null && !loadError && <BookListSkeleton />}

        {loadError && <ErrorBanner message={loadError} onRetry={() => { void loadBooks(); }} />}

        {books !== null && books.length === 0 && (
          <EmptyState onNew={openCreate} />
        )}

        {books !== null && books.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Book drafts">
            {books.map((book) => (
              <li key={book.id}>
                {editingId === book.id ? (
                  <div className="rounded-2xl border border-violet-200 bg-bg-surface p-5 shadow-sm">
                    <h3 className="mb-4 font-display text-lg font-semibold text-text-primary">
                      Edit Draft
                    </h3>
                    <form onSubmit={(e) => { void handleUpdate(e, book.id); }}>
                      <DraftFormFields
                        values={editForm}
                        onChange={setEditForm}
                        error={editError}
                        submitting={saving}
                        submitLabel="Save"
                        onCancel={() => setEditingId(null)}
                      />
                    </form>
                  </div>
                ) : (
                  <BookCard
                    book={book}
                    onEdit={() => startEdit(book)}
                    onDelete={() => { void handleDelete(book.id); }}
                    deleting={deletingId === book.id}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

// ── DraftFormFields ───────────────────────────────────────────────────────────

interface DraftFormFieldsProps {
  values: DraftFormValues;
  onChange: (v: DraftFormValues) => void;
  error: string | null;
  submitting: boolean;
  submitLabel: string;
  onCancel: () => void;
}

function DraftFormFields({
  values,
  onChange,
  error,
  submitting,
  submitLabel,
  onCancel,
}: DraftFormFieldsProps) {
  const set = (patch: Partial<DraftFormValues>) => onChange({ ...values, ...patch });

  return (
    <>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-light px-4 py-3 text-sm text-danger-base">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-secondary">
            Child&apos;s name <span className="text-danger-base" aria-hidden="true">*</span>
          </span>
          <input
            required
            value={values.childName}
            onChange={(e) => set({ childName: e.target.value })}
            placeholder="e.g. Emma"
            maxLength={80}
            className="rounded-lg border border-border-default bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-secondary">
            Age <span className="text-danger-base" aria-hidden="true">*</span>
          </span>
          <input
            required
            type="number"
            min={1}
            max={12}
            value={values.childAge}
            onChange={(e) => set({ childAge: Number(e.target.value) })}
            className="rounded-lg border border-border-default bg-white px-3 py-2 text-sm text-text-primary focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-secondary">
            Language <span className="text-danger-base" aria-hidden="true">*</span>
          </span>
          <select
            value={values.language}
            onChange={(e) => set({ language: e.target.value as SupportedLanguage })}
            className="rounded-lg border border-border-default bg-white px-3 py-2 text-sm text-text-primary focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-secondary">
            Theme <span className="text-danger-base" aria-hidden="true">*</span>
          </span>
          <input
            required
            value={values.theme}
            onChange={(e) => set({ theme: e.target.value })}
            placeholder="e.g. Friendship and courage"
            maxLength={120}
            className="rounded-lg border border-border-default bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
          />
        </label>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-brand transition-all hover:bg-violet-500 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 items-center rounded-xl border border-border-default px-5 text-sm font-semibold text-text-primary transition-all hover:bg-stone-100"
        >
          Cancel
        </button>
      </div>
    </>
  );
}

// ── BookCard ──────────────────────────────────────────────────────────────────

interface BookCardProps {
  book: BookDto;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}

function BookCard({ book, onEdit, onDelete, deleting }: BookCardProps) {
  const isDraft = book.status === BookStatus.Created;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border-subtle bg-bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="font-display text-lg font-semibold leading-snug text-text-primary">
          {book.title ?? 'Untitled'}
        </p>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isDraft
              ? 'bg-stone-100 text-text-muted'
              : 'bg-violet-50 text-violet-700'
          }`}
        >
          {book.status}
        </span>
      </div>

      <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {book.childName && (
          <>
            <dt className="text-text-muted">For</dt>
            <dd className="font-medium text-text-secondary">
              {book.childName}, age {book.childAge}
            </dd>
          </>
        )}
        {book.language && (
          <>
            <dt className="text-text-muted">Language</dt>
            <dd className="font-medium text-text-secondary">{book.language}</dd>
          </>
        )}
        {book.theme && (
          <>
            <dt className="text-text-muted">Theme</dt>
            <dd className="font-medium text-text-secondary">{book.theme}</dd>
          </>
        )}
      </dl>

      <p className="mb-4 mt-auto text-xs text-text-muted">
        Created {new Date(book.createdAt).toLocaleDateString()}
      </p>

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 rounded-lg border border-border-default py-1.5 text-sm font-medium text-text-secondary transition-all hover:bg-stone-100"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="flex-1 rounded-lg border border-danger-base/20 bg-danger-light py-1.5 text-sm font-medium text-danger-base transition-all hover:bg-red-100 disabled:opacity-60"
        >
          {deleting ? '…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

// ── Skeleton / Empty / Error ──────────────────────────────────────────────────

function BookListSkeleton() {
  return (
    <ul
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Loading book drafts"
      aria-busy="true"
    >
      {[1, 2, 3].map((i) => (
        <li key={i} className="h-52 rounded-2xl skeleton" />
      ))}
    </ul>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-default py-20 text-center">
      <p className="mb-2 text-lg font-semibold text-text-primary">No book drafts yet</p>
      <p className="mb-6 text-sm text-text-muted">Create your first personalized story</p>
      <button
        onClick={onNew}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-brand transition-all hover:bg-violet-500"
      >
        <span aria-hidden="true">+</span> Create First Book
      </button>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between rounded-xl border border-danger-base/20 bg-danger-light px-5 py-4"
    >
      <p className="text-sm text-danger-base">{message}</p>
      <button onClick={onRetry} className="text-sm font-semibold text-danger-base underline">
        Retry
      </button>
    </div>
  );
}
