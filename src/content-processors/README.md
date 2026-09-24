# Content processors

PagePrint selects one content processor before extraction. Processors are ordered from most specific
to least specific in `registry.ts`; the general Readability processor must remain last as the fallback.

Each processor owns four decisions:

1. `matches` identifies the platform, including custom-domain installations.
2. `isReadable` decides whether PagePrint should offer conversion.
3. `extract` returns the platform's article body and metadata.
4. `normalizeContent` converts platform-specific markup into PagePrint's shared document semantics.

Normalization is where a processor should distinguish structural concepts that generic HTML cannot
reliably identify, such as footnotes, image lightbox wrappers, embeds, or publication widgets. After
normalization, the shared pipeline removes unsupported media, resolves and inlines images, opens the
editor, and applies the user's link-handling preference.

To add another platform:

1. Implement `ContentProcessor` in a new file in this directory.
2. Keep platform selectors and transformations inside that file.
3. Add focused fixtures/tests for its semantic normalization.
4. Register it before `generalContentProcessor` in `registry.ts`.

Do not add platform conditionals to `ContentExtractor` or the general processor.
