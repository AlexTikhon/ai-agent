# PDF text rendering notes

Covers `apps/api/src/pdf/pdf-renderer.ts`: how text is laid out, current font
limitations, and what a future Unicode font phase should do.

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

Image blocks are still rendered as labelled placeholder rectangles; real
image embedding is a separate, not-yet-implemented future phase.
