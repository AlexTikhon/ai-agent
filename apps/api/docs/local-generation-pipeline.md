# Local generation pipeline

Maps the full local book-generation lifecycle: create → generate → preview.
Everything described here runs locally and deterministically — no network
calls, no external AI providers, no cloud dependency.

## Lifecycle

1. **Create** — `POST /api/books` (`BooksController.create` →
   `BooksService.create`) inserts a `Book` row scoped to the current user.
   Status starts at `created` (Prisma column default).
2. **Update draft fields** — `PATCH /api/books/:id`
   (`BooksService.update`) is only allowed while `status === created`;
   otherwise it throws `ConflictException` (409).
3. **Trigger generation** — `POST /api/books/:id/generate`
   (`BooksService.startGeneration`):
   - Requires `childName`, `childAge`, `language`, `theme` to already be set
     on the book — missing any throws `BadRequestException` (400) listing
     every missing field.
   - Requires `status === created` — otherwise `ConflictException` (409)
     ("Generation already started or completed for this book").
   - Delegates to `AgentService.startBookGeneration(book)`.
4. **Generation** — `AgentService.startBookGeneration` (see below) runs
   synchronously within the request and returns the final `Book` row
   (`complete` or `failed`).
5. **Preview** — `GET /api/books/:id/pdf/preview`
   (`BooksService.getPreviewPdfBuffer` → `PdfStorage.getPreviewPdf`) streams
   the rendered PDF back as `application/pdf`.

There is no queue/worker: generation runs inline inside the `generate`
request handler and the HTTP response only returns once the whole pipeline
(including PDF render) has finished or failed.

## What `AgentService.startBookGeneration` does, in order

- (a) `storyGenerationProvider.generateStory({ bookId, childName, childAge,
  theme, language })` — delegates all character/story/page/image-metadata
  planning to the injected `StoryGenerationProvider` (see "Story generation
  provider boundary" below) and returns `{ characterCard, storyPlan,
  bookPreview, imageGenerationResult }`. If this call throws, `AgentService`
  catches it, marks the book `failed` (`failedStep: 'story_plan'`,
  `errorMessage` from the caught error), writes a single `story_plan`
  `AgentLog` row with `status: 'error'`, and returns immediately — none of
  the steps below run.
- (b) `saveMockImageAssets` (private helper) — for every
  `GeneratedImageEntry` in the provider's `imageGenerationResult`, generates
  deterministic PNG bytes via `generateMockImagePng(entry.seed)`
  (`apps/api/src/images/mock-image-producer.ts`) and saves them through
  `ImageAssetStorage.saveImageAsset(imageAssetKey(bookId, kind, pageNumber),
  buffer, 'image/png')`. Saves run in parallel; a failure on any one image is
  caught, logged (`Failed to save mock image asset for entry "<id>": ...`),
  and skipped — it does **not** fail generation. A skipped image just
  degrades to a placeholder rectangle at render time (see below).
- (c) `buildBookLayout` (private function in `agent.service.ts`) — builds the
  print-ready `BookLayout` (2400×2400px canvas, `square_8x8` trim),
  referencing the same mock `imageUrl`s. This step stays in `AgentService`
  rather than the story provider — it's print-layout logic over already-built
  story/image data, not story content itself.

Then, in three phases against the database:

- **Phase 1** — one `prisma.book.update`: status → `layout`, persists
  `characterCard`, `storyPlan`, `bookPreview`, `imageGenerationResult`,
  `bookLayout`.
- **Phase 2** — PDF render, wrapped in try/catch:
  1. `buildImageBufferResolver(imageAssetStorage, bookId, layout.entries)`
     pre-resolves every layout entry's saved bytes (if any) from
     `ImageAssetStorage` into a synchronous lookup closure.
  2. `renderStorybookPdf(bookLayout, { resolveImageBuffer })` renders one PDF
     page per layout entry, embedding real bytes for any entry the resolver
     has bytes for, and drawing a labelled placeholder rectangle for the
     rest.
  3. `pdfStorage.savePreviewPdf(bookId, buffer)` persists the PDF (default
     `LocalPdfStorage`: `tmp/books/<bookId>/storybook.pdf`) and returns a
     `url`.
  - Any error in this phase (render or storage) is caught, logged, and
    recorded — the book is **not** marked complete.
- **Phase 3** — second `prisma.book.update`:
  - On success: status → `complete`, `previewPdfUrl` set to the URL from
    Phase 2.
  - On failure: status → `failed`, `errorMessage` set to the caught error's
    message, `failedStep` set to `pdf_render`. `previewPdfUrl` is left
    untouched (not set).
- Finally, nine `AgentLog` rows are written in one `createMany` call, all
  sharing a single `traceId`: `char_build`, `story_plan`, `page_plan`,
  `story_draft`, `illust_plan`, `preview_ready`, `image_gen`, `layout`,
  `pdf_render` — the last one's `status` is `success` or `error` depending on
  Phase 2's outcome, with the error message attached when it failed.

## Story generation provider boundary

`apps/api/src/agent/story-generation-provider.ts` defines `StoryGenerationProvider`,
the internal boundary `AgentService` depends on for all character/story/page/
image-metadata planning, mirroring the `PdfStorage` / `ImageAssetStorage`
pattern:

```ts
interface StoryGenerationInput {
  bookId: string;
  childName: string;
  childAge: number;
  theme: string;
  language: string;
}

interface StoryGenerationResult {
  characterCard: CharacterCard;
  storyPlan: StoryPlan & { pages: Array<PagePlan & { storyText: string; illustration: IllustrationPlan }> };
  bookPreview: BookPreview;
  imageGenerationResult: ImageGenerationResult;
}

interface StoryGenerationProvider {
  generateStory(input: StoryGenerationInput): Promise<StoryGenerationResult>;
}
```

- Registered via `STORY_GENERATION_PROVIDER_TOKEN` in `books.module.ts`,
  injected into `AgentService`'s constructor exactly like `PDF_STORAGE_TOKEN`
  and `IMAGE_ASSET_STORAGE_TOKEN`.
- `MockStoryGenerationProvider` is the only implementation today. It's a
  straight extraction of the hand-written template logic that used to live
  directly in `AgentService` (`buildCharacterCard`, `buildStoryPlan`,
  `buildPagePlan`, `buildStoryDraft`, `buildIllustrationPlan`,
  `buildBookPreview`, `buildImageGenerationResult` — now private functions in
  `story-generation-provider.ts`) — same inputs still produce byte-identical
  output; no behavior changed by the extraction.
- Image *metadata* (prompts, mock `imageUrl` placeholder paths,
  `GeneratedImageEntry` records) is built by the provider as part of
  `imageGenerationResult`. Actual image *bytes* are not — that stays behind
  `ImageAssetStorage` / `generateMockImagePng` (see "Images" in
  `apps/api/docs/pdf-rendering.md`), called separately by `AgentService`
  after the provider returns. This split is deliberate: a future real-LLM
  story provider and a future real-image provider are independent phases and
  shouldn't be coupled.
- `buildBookLayout` (print-layout geometry over already-built story/image
  data) intentionally stayed a private function in `agent.service.ts` rather
  than moving into the provider — it isn't story content, and moving it would
  have widened this phase's scope beyond the story-generation boundary.
- **Failure behavior**: if `generateStory` throws, `AgentService` catches it
  before Phase 1 runs, marks the book `failed` (`failedStep: 'story_plan'`,
  `errorMessage` from the caught error's message), writes one `story_plan`
  `AgentLog` row with `status: 'error'`, and returns — no image assets are
  saved, no layout is built, no PDF is rendered or stored.

### How a future real-LLM provider should slot in

Implement `StoryGenerationProvider` with a class that calls a real LLM (e.g.
`RealStoryGenerationProvider`), returning the exact same
`StoryGenerationResult` shape `MockStoryGenerationProvider` returns today, and
swap the `useFactory` for `STORY_GENERATION_PROVIDER_TOKEN` in
`books.module.ts`. `AgentService` and everything downstream (image asset
saving, layout, PDF render, storage) need no changes — they only depend on
the interface, not on how the result was produced.

## Status transitions

```
created --(generate: validation + status check)--> [in-request pipeline] --> layout --> complete
                                                                                      \-> failed
```

`created` and `layout` are both transient from the caller's perspective —
`layout` only exists as the Phase-1 intermediate value inside the same
request; the HTTP response always observes the final `complete` or `failed`
status, never `layout`.

## Preview endpoint behavior

`GET /api/books/:id/pdf/preview` (`BooksService.getPreviewPdfBuffer`):

1. `findOwnedOrThrow` — 404 (`NotFoundException`) if the book doesn't exist,
   belongs to another user, or is soft-deleted.
2. If `previewPdfUrl` is still `null` (generation hasn't completed, or
   failed) — 409 (`ConflictException`, "PDF not ready — book generation is
   not complete").
3. `pdfStorage.getPreviewPdf(bookId)` — 404 (`NotFoundException`, "PDF file
   not found in storage") if `previewPdfUrl` is set but the file is missing
   from storage (e.g. manually deleted from `tmp/`).
4. Otherwise returns `{ buffer, contentType: 'application/pdf', filename }`,
   and `BooksController.getPreviewPdf` sets `Content-Type`,
   `Content-Disposition: inline`, and `Content-Length` headers and streams it
   back as a `StreamableFile`.

`:id` route params (`findOne`, `update`, `generate`, `remove`,
`pdf/preview`) are all decorated with Nest's built-in `ParseUUIDPipe`, which
rejects non-UUID values with a 400 before the controller method runs. That's
a framework-level guarantee exercised by Nest's own tests, not this repo's;
this repo has no HTTP-level (supertest/e2e) test harness today, so it isn't
re-verified here — see "Test coverage" below.

## Failure states summary

| State | Trigger | HTTP surface |
| --- | --- | --- |
| `BadRequestException` (400) | `generate` called with missing draft fields | `POST /:id/generate` |
| `ConflictException` (409) | `update`/`remove` after `status !== created` | `PATCH /:id`, `DELETE /:id` |
| `ConflictException` (409) | `generate` called when `status !== created` | `POST /:id/generate` |
| `ConflictException` (409) | preview requested before `previewPdfUrl` is set | `GET /:id/pdf/preview` |
| `NotFoundException` (404) | book missing / not owned / soft-deleted | any `:id` route |
| `NotFoundException` (404) | `previewPdfUrl` set but file missing from storage | `GET /:id/pdf/preview` |
| `BookStatus.failed` | PDF render or `pdfStorage.savePreviewPdf` throws | `POST /:id/generate` response body |
| `BookStatus.failed` | `storyGenerationProvider.generateStory` throws (`failedStep: 'story_plan'`) | `POST /:id/generate` response body |
| per-image save failure (non-fatal) | one `ImageAssetStorage.saveImageAsset` call throws | logged only; that image renders as a placeholder |

## Test coverage

- `apps/api/src/books/books.service.spec.ts` — `create`, `findAllForUser`,
  `findOneForUser`, `update`, `remove`, `startGeneration` (all validation
  branches), `getPreviewPdfBuffer` (ready/not-ready/missing-file).
- `apps/api/src/books/books.controller.spec.ts` — thin pass-through wiring
  for every route plus exception propagation (404/409/400), and the preview
  endpoint's header-setting behavior.
- `apps/api/src/agent/agent.service.spec.ts` — every stage of
  `startBookGeneration` with `renderStorybookPdf` mocked (story/layout/image
  metadata, AgentLog rows, success/failure status transitions), plus
  dedicated coverage for the `StoryGenerationProvider` boundary: a failing
  provider marks the book `failed` without saving images/building
  layout/rendering a PDF, and `AgentService` calls `generateStory` with the
  expected input.
- `apps/api/src/agent/story-generation-provider.spec.ts` —
  `MockStoryGenerationProvider` in isolation: deterministic output for the
  same input, varies with `childName`/`theme`/`bookId`, and every required
  field is present on the returned `characterCard`, `storyPlan`,
  `bookPreview`, and `imageGenerationResult`.
- `apps/api/src/agent/agent.service.local-pipeline.spec.ts` — the one test
  in this file runs the **real** `generateMockImagePng` →
  `LocalImageAssetStorage` → `buildImageBufferResolver` →
  `renderStorybookPdf` chain (nothing mocked except `PrismaService` and
  `PdfStorage`) and asserts the resulting PDF buffer is non-trivially sized
  and contains a real `/Subtype /Image` object — proof that mock image bytes
  are actually embedded end-to-end, not just that each boundary works in
  isolation.
- `apps/api/src/images/image-asset-storage.spec.ts` and
  `apps/api/src/pdf/pdf-renderer.spec.ts` cover the storage and rendering
  boundaries directly, including the `/Subtype /Image` marker for a
  hand-supplied buffer.

Not covered, deliberately: real HTTP requests through Nest's pipes/filters
(no supertest/e2e harness exists in this package; see
`apps/api/src/books/books.controller.spec.ts` for controller-level
alternatives instead).

## What's intentionally not real yet

- **AI story generation** — `MockStoryGenerationProvider` (behind the
  `StoryGenerationProvider` boundary, see above) is hand-written templates,
  not an LLM call.
- **AI image generation** — `generateMockImagePng` produces a solid-color
  8×8 PNG swatch keyed by a deterministic hash of the entry's seed, not
  artwork from an image model.
- **Public image serving** — mock image bytes live only in
  `ImageAssetStorage` (local disk under `tmp/images/`) to be embedded into
  the PDF; nothing serves them over HTTP, and the `/mock-images/...` URLs
  recorded on `GeneratedImageEntry.imageUrl` resolve to nothing.
- **Async queues/workers** — generation runs inline in the `generate`
  request handler; there's no BullMQ job or background worker wired up yet
  (despite `@nestjs/bullmq` being a dependency).
- **Payments/auth** — `DevAuthGuard` stands in for real authentication;
  there's no payment gating on generation or preview access.

## Local demo (frontend)

The web app (`apps/web`) already has a full click-through UI for this
lifecycle — no extra wiring needed.

1. Start the API: `pnpm --filter @book/api dev` (defaults to
   `http://localhost:4000`).
2. Start the web app: `pnpm --filter @book/web dev` (defaults to
   `http://localhost:3000`; set `NEXT_PUBLIC_API_URL` if the API runs
   elsewhere).
3. Open `http://localhost:3000/dashboard` — click **+ New Book**, fill in
   the child/story wizard, and submit to create a `created` book.
4. Open the new book's detail page and click **Generate Story**. The whole
   pipeline (story/layout/mock images/PDF render) runs synchronously inside
   that one request, so the button shows "Generating…" until the response
   comes back with a final `complete` or `failed` status. If a page reload
   ever catches the book mid-pipeline, the detail page auto-polls every
   2.5s until it reaches a terminal status.
5. Once `status` is `complete`, an "Your PDF is ready" panel appears with
   **Open PDF** (new tab) and **Download PDF** links, both pointing at
   `GET /api/books/:id/pdf/preview`.

Everything shown — story text, illustration prompts, image URLs, the PDF
itself — is mock/local per "What's intentionally not real yet" above; no
external AI or network calls happen at any point in this flow.

## How a future real-provider phase should slot in

All three mock boundaries were built so a real provider drops in without
touching callers:

- **Real story generation**: implement `StoryGenerationProvider`
  (`apps/api/src/agent/story-generation-provider.ts`) with real LLM calls
  and swap the `useFactory` for `STORY_GENERATION_PROVIDER_TOKEN` in
  `books.module.ts` — see "Story generation provider boundary" above.
  `AgentService` and everything downstream do not need to change.
- **Real image generation**: replace the call to `generateMockImagePng` in
  `AgentService.saveMockImageAssets` with a real provider call, still saved
  through `ImageAssetStorage.saveImageAsset`. No changes needed to
  `buildImageBufferResolver` or `renderStorybookPdf` — see
  `apps/api/docs/pdf-rendering.md` for the detailed boundary contract.
- **Cloud storage**: `PdfStorage` already has a `CloudPdfStorage` (S3/R2)
  implementation behind `PDF_STORAGE_DRIVER`; `ImageAssetStorage` would need
  an equivalent cloud implementation following the same pattern before image
  bytes could live outside local disk.
