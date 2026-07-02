# PDF rendering notes

Covers `apps/api/src/pdf/pdf-renderer.ts`: how text is laid out, current font
limitations, how image embedding works, and what future phases should do.

## Text wrapping

Line wrapping is handled entirely by PDFKit's built-in `.text(text, x, y, {
width, height, align, lineGap })` call in `renderTextBlock`. There is no
custom line-wrap helper in this codebase — an earlier `wrapText` utility
existed but was never wired into the renderer (PDFKit's wrapping already
covers the deterministic layout engine's needs) and was removed as dead code
in Phase 2T.

If a future requirement needs explicit line-by-line control (e.g. precise
line-count budgeting before layout, or custom hyphenation), reintroduce a
small pure helper and wire it into `renderTextBlock` deliberately, with
tests — don't let it sit unused again.

## Font / Unicode limitation

`resolveFont` maps layout font families to PDFKit's built-in fonts only:
`Helvetica`, `Helvetica-Bold`, `Times-Roman`, `Times-Bold`. These built-in
fonts only support the **WinAnsi encoding** (roughly Latin-1). Characters
outside that range — CJK, Cyrillic, Arabic, Hebrew, many accented Latin
characters, emoji — will render blank or as missing glyphs.

This is a known, accepted limitation for the current phase. Book text
containing such characters currently passes DTO validation and layout, but
will render incorrectly in the final PDF.

## Future Unicode font phase (not implemented)

To support non-Latin text, a future phase should:

1. Embed one or more real Unicode-capable TTF/OTF fonts as project assets
   (properly licensed for embedding/redistribution).
2. Register them once per render via `doc.registerFont(name, fontPathOrBuffer)`.
3. Extend `resolveFont` (or a small font-registry seam next to it) to select
   an embedded font instead of a built-in name when the layout requires it.
4. Add rendering tests that assert non-Latin text no longer produces blank
   glyphs (e.g. via extracted PDF text streams, not full binary snapshots).

Do not attempt this by downloading fonts at runtime or depending on fonts
installed on the host system — rendering must stay deterministic and
network-free.

## Images

Covers image handling in `renderStorybookPdf` / `renderImageBlock` in
`apps/api/src/pdf/pdf-renderer.ts`.

### The embedding boundary

`renderStorybookPdf(layout, options?)` accepts an optional
`options.resolveImageBuffer: (imageBlock, entry) => Buffer | undefined`. This
is the *only* way the renderer ever gets image bytes:

- It is called synchronously, once per image block, purely in-process.
- Returning `undefined` (or omitting the option entirely) means "no bytes
  available" and the renderer draws the existing labelled placeholder
  rectangle — today's default behavior is unchanged.
- Returning a `Buffer` embeds it via PDFKit's `doc.image()`, using `cover`
  for `objectFit: 'cover'` and `fit` for `objectFit: 'contain'`, both with
  `align: 'center'` / `valign: 'center'` — this fits/covers the image inside
  the layout box, preserves aspect ratio, never overflows the box, and
  centers it, matching the layout engine's `LayoutImageBlock.objectFit`.

The renderer deliberately does **not**:

- fetch `imageBlock.imageUrl` over the network or from disk itself,
- call any AI/image-generation API,
- read from S3/R2 or any other cloud storage.

Those concerns belong to whatever supplies the resolver, not to the PDF
renderer — this keeps rendering local, deterministic, and side-effect-free.

### Current pipeline state

As of this phase, `imageUrl` values produced by the local-mock image
generation step (`apps/api/src/agent/agent.service.ts`,
`buildImageGenerationResult`) are placeholder path strings like
`/mock-images/<bookId>/cover.svg` — no file is ever written to that path and
nothing serves it. No real image bytes exist anywhere in the current local
pipeline, so `renderStorybookPdf` is called without a `resolveImageBuffer`
option (see `AgentService`) and every image still renders as a placeholder
rectangle in practice, exactly as before this phase.

### Failure handling

If a resolver returns a `Buffer` but PDFKit fails to parse/embed it (e.g.
corrupt or unsupported image bytes), the renderer logs a warning
(`[pdf-renderer] Failed to embed image for entry "<id>" (<kind>): <message>`)
and falls back to the placeholder rectangle for that image only — it does not
fail the whole page or PDF. A malformed layout box (a structural layout bug,
not an image-bytes problem) still fails the whole page, as before, and is
caught by the existing per-entry try/catch that renders a red error page.

### Future real-image phase (not implemented)

A future phase that wires up real image generation/storage should implement
`resolveImageBuffer` (e.g. reading bytes already fetched into memory or from
local disk under an existing storage convention) and pass it into the
`AgentService` call to `renderStorybookPdf`. It should not change the
renderer itself — the boundary above is intentionally already in place for
that.
