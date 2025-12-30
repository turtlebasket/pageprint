import { match } from "ts-pattern";
import { PrintStyles } from "./print-styles";
import {
  MessageType,
  type MessageRequest,
  type MessageResponse,
  type ExtractedContent,
  type PDFOptions,
} from "./types";

console.log("[Background] PagePrint v0.2.0 background service worker started - NO WINDOW/URL APIS");

chrome.runtime.onMessage.addListener(
  (
    request: MessageRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ): boolean => {
    console.log("[Background] Received message:", request.type);

    match(request)
      .with({ type: MessageType.EXTRACT_CONTENT }, () => {
        handleExtractContent(sendResponse);
      })
      .with({ type: MessageType.GENERATE_PDF }, (req) => {
        handleGeneratePDF(req.data, sendResponse);
      })
      .with({ type: MessageType.CHECK_READABILITY }, () => {
        handleCheckReadability(sendResponse);
      })
      .with({ type: MessageType.PRINT }, () => {
        console.log("[Background] Ignoring PRINT message (handled in content script)");
      })
      .exhaustive();

    return true;
  }
);

function isInternalPage(url: string): boolean {
  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("view-source:")
  );
}

interface ValidTab extends chrome.tabs.Tab {
  id: number;
  url: string;
}

async function getActiveTab(): Promise<ValidTab> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab || typeof tab.id !== "number") {
    throw new Error("No active tab found");
  }

  if (typeof tab.url !== "string" || !tab.url) {
    throw new Error("Cannot access this page");
  }

  return tab as ValidTab;
}

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    console.log("[Background] Content script injected");
    await new Promise((resolve) => setTimeout(resolve, 100));
  } catch {
    console.log("[Background] Content script already loaded or injection failed");
  }
}

async function handleExtractContent(
  sendResponse: (response: MessageResponse<ExtractedContent>) => void
): Promise<void> {
  try {
    console.log("[Background] Querying active tab...");
    const tab = await getActiveTab();

    if (isInternalPage(tab.url)) {
      throw new Error("Cannot extract content from browser internal pages");
    }

    console.log(`[Background] Found active tab: ${tab.id}, URL: ${tab.url}`);

    await ensureContentScript(tab.id);

    console.log("[Background] Sending EXTRACT_CONTENT message to content script...");
    const response = await chrome.tabs.sendMessage<
      MessageRequest,
      MessageResponse<ExtractedContent>
    >(tab.id, {
      type: MessageType.EXTRACT_CONTENT,
    });

    console.log(
      "[Background] Received response from content script:",
      response.success ? "success" : "failed"
    );
    if (!response.success) {
      console.error("[Background] Content script error:", response.error);
    }

    sendResponse(response);
  } catch (error) {
    console.error("[Background] Failed to extract content:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to extract content";

    if (errorMessage.includes("Receiving end does not exist")) {
      sendResponse({
        success: false,
        error: "Content script not loaded. Please refresh the page and try again.",
      });
    } else {
      sendResponse({
        success: false,
        error: errorMessage,
      });
    }
  }
}

async function handleCheckReadability(
  sendResponse: (response: MessageResponse<boolean>) => void
): Promise<void> {
  try {
    console.log("[Background] Checking page readability...");
    const tab = await getActiveTab();

    if (isInternalPage(tab.url)) {
      sendResponse({ success: true, data: false });
      return;
    }

    console.log(`[Background] Checking readability for tab: ${tab.id}`);

    await ensureContentScript(tab.id);

    console.log("[Background] Sending CHECK_READABILITY message to content script...");
    const response = await chrome.tabs.sendMessage<MessageRequest, MessageResponse<boolean>>(
      tab.id,
      {
        type: MessageType.CHECK_READABILITY,
      }
    );

    console.log(
      "[Background] Readability check result:",
      response.success ? response.data : "failed"
    );
    sendResponse(response);
  } catch (error) {
    console.error("[Background] Failed to check readability:", error);
    sendResponse({ success: true, data: false });
  }
}

async function handleGeneratePDF(
  { content, options }: { content: ExtractedContent; options?: PDFOptions },
  sendResponse: (response: MessageResponse<{ htmlContent: string; title: string }>) => void
): Promise<void> {
  try {
    console.log("[Background] Generating PDF...");
    console.log(
      `[Background] Content title: "${content.title}", length: ${content.content.length} chars`
    );
    console.log("[Background] PDF options:", options);

    const htmlContent = PrintStyles.createPrintableHTML(content, options);
    console.log(`[Background] Printable HTML generated, length: ${htmlContent.length} chars`);
    console.log("[Background] PDF generation successful");

    sendResponse({
      success: true,
      data: {
        htmlContent,
        title: content.title,
      },
    });
  } catch (error) {
    console.error("[Background] PDF generation failed:", error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "PDF generation failed",
    });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Background] PagePrint extension installed");
});

chrome.action.onClicked.addListener(async (tab: chrome.tabs.Tab) => {
  if (typeof tab.id !== "number") return;

  try {
    console.log("[Background] Action clicked, extracting content...");
    const response = await chrome.tabs.sendMessage<
      MessageRequest,
      MessageResponse<ExtractedContent>
    >(tab.id, {
      type: MessageType.EXTRACT_CONTENT,
    });

    if (response.success) {
      console.log("[Background] Content extracted, generating PDF...");
      const pdfResponse = await chrome.runtime.sendMessage<
        MessageRequest,
        MessageResponse<{ htmlContent: string; title: string }>
      >({
        type: MessageType.GENERATE_PDF,
        data: { content: response.data },
      });

      if (pdfResponse.success) {
        console.log("[Background] PDF generated, opening print dialog...");
        await downloadHTMLAsPDF(pdfResponse.data.htmlContent);
      }
    }
  } catch (error) {
    console.error("[Background] Extension action failed:", error);
  }
});

async function downloadHTMLAsPDF(htmlContent: string): Promise<void> {
  console.log("[Background] Creating print tab...");

  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;

  const tab = await chrome.tabs.create({
    url: dataUrl,
    active: true,
  });

  if (typeof tab.id !== "number") {
    console.error("[Background] Failed to create print tab");
    return;
  }

  console.log("[Background] Print tab created, waiting for load...");

  chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
    if (tabId === tab.id && changeInfo.status === "complete") {
      chrome.tabs.onUpdated.removeListener(listener);
      console.log("[Background] Triggering print dialog...");
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { type: MessageType.PRINT }).catch(() => {
          console.log("[Background] Failed to send print message, tab may have been closed");
        });
      }, 500);
    }
  });
}
