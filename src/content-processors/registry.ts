import { generalContentProcessor } from "./general";
import { substackContentProcessor } from "./substack";
import type { ContentProcessor, ContentProcessorContext } from "./types";

const contentProcessors: readonly ContentProcessor[] = [
  substackContentProcessor,
  generalContentProcessor,
];

export function selectContentProcessor(
  document: Document,
  context: ContentProcessorContext
): ContentProcessor {
  return (
    contentProcessors.find((processor) => processor.matches(document, context)) ??
    generalContentProcessor
  );
}
