import { match } from "ts-pattern";
import { ContentExtractor } from "./content-extractor";
import {
  MessageType,
  type MessageRequest,
  type MessageResponse,
  type ExtractedContent,
} from "./types";

declare global {
  interface Window {
    extractReadableContent: () => ExtractedContent | null;
    __pageprint_loaded?: boolean;
  }
}

if (window.__pageprint_loaded) {
  console.log("[Content Script] Already loaded, skipping initialization");
} else {
  window.__pageprint_loaded = true;

  console.log("[Content Script] PagePrint content script loaded");

  chrome.runtime.onMessage.addListener(
    (
      request: MessageRequest,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: MessageResponse) => void
    ): boolean => {
      match(request)
        .with({ type: MessageType.EXTRACT_CONTENT }, () => {
          console.log("[Content Script] Received EXTRACT_CONTENT message");
          handleContentExtraction()
            .then((content) => {
              console.log(
                "[Content Script] Content extraction completed:",
                content ? "success" : "failed"
              );
              if (content) {
                sendResponse({
                  success: true,
                  data: content,
                });
              } else {
                sendResponse({
                  success: false,
                  error: "Failed to extract content",
                });
              }
            })
            .catch((error) => {
              console.error("[Content Script] Content extraction error:", error);
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              });
            });
        })
        .with({ type: MessageType.CHECK_READABILITY }, () => {
          console.log("[Content Script] Received CHECK_READABILITY message");
          const isReadable = ContentExtractor.isProbablyReaderable(document);
          console.log("[Content Script] Page is readable:", isReadable);
          sendResponse({
            success: true,
            data: isReadable,
          });
        })
        .with({ type: MessageType.PRINT }, () => {
          console.log("[Content Script] Received PRINT message, triggering print dialog...");
          window.print();
        })
        .with({ type: MessageType.GENERATE_PDF }, () => {
          console.log("[Content Script] Ignoring GENERATE_PDF message");
        })
        .exhaustive();

      return true;
    }
  );

  async function handleContentExtraction(): Promise<ExtractedContent | null> {
    try {
      console.log("[Content Script] Starting content extraction handler...");
      console.log("[Content Script] Waiting 100ms for dynamic content to load...");
      await new Promise((resolve) => setTimeout(resolve, 100));

      console.log("[Content Script] Calling ContentExtractor.extractContent...");
      const content = ContentExtractor.extractContent(document);

      if (!content) {
        console.error("[Content Script] ContentExtractor returned null");
        throw new Error("Could not extract readable content from this page");
      }

      console.log("[Content Script] Content extraction successful");
      return content;
    } catch (error) {
      console.error("[Content Script] Failed to extract content:", error);
      throw error;
    }
  }

  window.extractReadableContent = () => {
    return ContentExtractor.extractContent(document);
  };
}
