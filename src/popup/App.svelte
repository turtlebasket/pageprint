<script lang="ts">
  import { onMount } from "svelte";
  import {
    MessageType,
    type MessageRequest,
    type MessageResponse,
    type ExtractedContent,
    type PDFOptions,
    type LinkHandling,
  } from "../types";
  import "../styles.css";

  let isExtracting = false;
  let isGenerating = false;
  let error = "";
  let success = false;
  let isCheckingReadability = true;
  let isReadable = false;

  let columns = 2;
  let fontSize = 11;
  let verticalMargin = 0.5;
  let horizontalMargin = 0.5;
  let pageSize: "A4" | "Letter" = "Letter";
  let linkHandling: LinkHandling = "references";

  onMount(async () => {
    chrome.storage.local.get(
      ["columns", "fontSize", "verticalMargin", "horizontalMargin", "pageSize", "linkHandling"],
      (result) => {
        if (result["columns"] !== undefined) columns = result["columns"];
        if (result["fontSize"] !== undefined) fontSize = result["fontSize"];
        if (result["verticalMargin"] !== undefined) verticalMargin = result["verticalMargin"];
        if (result["horizontalMargin"] !== undefined) horizontalMargin = result["horizontalMargin"];
        if (result["pageSize"] !== undefined) pageSize = result["pageSize"];
        if (result["linkHandling"] !== undefined) linkHandling = result["linkHandling"];
      }
    );

    try {
      console.log("[Popup] Checking page readability...");
      const response = await chrome.runtime.sendMessage<MessageRequest, MessageResponse<boolean>>({
        type: MessageType.CHECK_READABILITY,
      });

      if (response.success) {
        isReadable = response.data;
        console.log("[Popup] Page is readable:", isReadable);
      } else {
        console.error("[Popup] Readability check failed:", response.error);
        isReadable = false;
      }
    } catch (err) {
      console.error("[Popup] Failed to check readability:", err);
      isReadable = false;
    } finally {
      isCheckingReadability = false;
    }
  });

  function saveSettings() {
    chrome.storage.local.set({
      columns,
      fontSize,
      verticalMargin,
      horizontalMargin,
      pageSize,
      linkHandling,
    });
  }

  $: if (!isExtracting && !isGenerating) {
    saveSettings();
  }

  async function extractAndGeneratePDF() {
    try {
      console.log("[Popup] Starting extraction...");
      error = "";
      isExtracting = true;

      const response = await chrome.runtime.sendMessage<
        MessageRequest,
        MessageResponse<ExtractedContent>
      >({
        type: MessageType.EXTRACT_CONTENT,
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to extract content");
      }

      const extractedContent = response.data;
      console.log("[Popup] Content extracted:", {
        title: extractedContent.title,
        contentLength: extractedContent.content.length,
      });
      isExtracting = false;

      const options: PDFOptions = {
        columns,
        fontSize,
        verticalMargin,
        horizontalMargin,
        pageSize,
        linkHandling,
      };

      console.log("[Popup] Generating editor HTML...");
      isGenerating = true;
      const pdfResponse = await chrome.runtime.sendMessage<
        MessageRequest,
        MessageResponse<{ htmlContent: string; editorHtml: string; title: string }>
      >({
        type: MessageType.GENERATE_PDF,
        data: { content: extractedContent, options },
      });

      if (!pdfResponse.success) {
        throw new Error(pdfResponse.error || "Failed to generate content");
      }

      const { editorHtml } = pdfResponse.data;

      console.log("[Popup] Opening editor window...");
      const editorWindow = window.open("", "_blank", "width=800,height=700");
      if (!editorWindow) {
        throw new Error("Failed to open editor window — check your popup blocker");
      }

      editorWindow.document.write(editorHtml);
      editorWindow.document.close();

      success = true;
      isGenerating = false;
      console.log("[Popup] Editor window opened");

      setTimeout(() => {
        window.close();
      }, 1000);
    } catch (err) {
      console.error("[Popup] Error:", err);
      error = err instanceof Error ? err.message : "An unknown error occurred";
      isExtracting = false;
      isGenerating = false;
    }
  }
</script>

<div class="popup-container p-4 w-80">
  <header class="text-center mb-4 pb-3 border-b border-gray-200">
    <h1 class="text-xl font-semibold text-gray-900 mb-1">PagePrint</h1>
    <p class="text-sm text-gray-600">Convert this page to a print-friendly PDF</p>
  </header>

  {#if isCheckingReadability}
    <main class="flex flex-col items-center justify-center min-h-[80px]">
      <div class="text-center">
        <div
          class="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"
        ></div>
        <p class="text-sm text-gray-600">Checking page...</p>
      </div>
    </main>
  {:else if !isReadable}
    <main class="flex flex-col items-center justify-center min-h-[80px]">
      <div
        class="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 w-full"
      >
        <span class="text-lg">ℹ️</span>
        <div class="flex-1">
          <p class="text-sm text-amber-900 font-medium mb-1">
            This page isn't suitable for printing
          </p>
          <p class="text-xs text-amber-800">
            PagePrint works best with article-style content. This page doesn't appear to have enough
            readable text to convert.
          </p>
        </div>
      </div>
    </main>
  {:else if !success && !isExtracting && !isGenerating}
    <div class="mb-4 space-y-3">
      <div>
        <label for="pageSize" class="block text-sm font-medium text-gray-700 mb-1">
          Page Size
        </label>
        <select
          id="pageSize"
          bind:value={pageSize}
          class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Letter">Letter (8.5" × 11")</option>
          <option value="A4">A4 (210mm × 297mm)</option>
        </select>
      </div>

      <div>
        <label for="linkHandling" class="block text-sm font-medium text-gray-700 mb-1">
          Links
        </label>
        <select
          id="linkHandling"
          bind:value={linkHandling}
          class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="references">Link References</option>
          <option value="embed">Embed Links</option>
          <option value="none">Don't Include</option>
        </select>
      </div>

      <div>
        <label for="columns" class="block text-sm font-medium text-gray-700 mb-1">
          Columns: {columns}
        </label>
        <input
          id="columns"
          type="range"
          min="1"
          max="3"
          bind:value={columns}
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div>
        <label for="fontSize" class="block text-sm font-medium text-gray-700 mb-1">
          Font Size: {fontSize}pt
        </label>
        <input
          id="fontSize"
          type="range"
          min="8"
          max="14"
          bind:value={fontSize}
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div>
        <label for="verticalMargin" class="block text-sm font-medium text-gray-700 mb-1">
          Vertical Margin: {verticalMargin}in
        </label>
        <input
          id="verticalMargin"
          type="range"
          min="0.25"
          max="1.5"
          step="0.25"
          bind:value={verticalMargin}
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div>
        <label for="horizontalMargin" class="block text-sm font-medium text-gray-700 mb-1">
          Horizontal Margin: {horizontalMargin}in
        </label>
        <input
          id="horizontalMargin"
          type="range"
          min="0.25"
          max="1.5"
          step="0.25"
          bind:value={horizontalMargin}
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>

    <main class="flex flex-col items-center justify-center min-h-[80px]">
      {#if error}
        <div
          class="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 w-full"
        >
          <span class="text-lg">⚠️</span>
          <span class="text-sm text-red-800">{error}</span>
        </div>
        <button
          class="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          on:click={extractAndGeneratePDF}
        >
          Try Again
        </button>
      {:else if success}
        <div
          class="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 w-full"
        >
          <span class="text-lg">✅</span>
          <span class="text-sm text-green-800">PDF generated! Check your print dialog.</span>
        </div>
      {:else if isExtracting || isGenerating}
        <div class="text-center">
          <div
            class="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"
          ></div>
          <p class="text-sm text-gray-600">
            {isExtracting ? "Extracting content..." : "Generating PDF..."}
          </p>
        </div>
      {:else}
        <button
          class="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 w-full"
          on:click={extractAndGeneratePDF}
        >
          Generate PDF
        </button>
      {/if}
    </main>
  {/if}

  {#if !isCheckingReadability}
    <footer class="mt-4 pt-3 border-t border-gray-200 text-center">
      <p class="text-xs text-gray-500">
        {#if isReadable}
          Extracts readable content and formats for printing
        {:else}
          Try PagePrint on articles, blog posts, or text-heavy pages
        {/if}
      </p>
    </footer>
  {/if}
</div>

<style>
  :global(html) {
    @apply bg-gray-100;
  }

  :global(body) {
    @apply m-0 p-0;
  }
</style>
