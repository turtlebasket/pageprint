<script lang="ts">
  import { onMount } from "svelte";
  import {
    MessageType,
    type MessageRequest,
    type MessageResponse,
    type ExtractedContent,
    type PDFOptions,
  } from "../types";
  import "../styles.css";

  let isExtracting = false;
  let isGenerating = false;
  let error = "";
  let success = false;

  let columns = 2;
  let fontSize = 11;
  let verticalMargin = 0.5;
  let horizontalMargin = 0.5;
  let pageSize: "A4" | "Letter" = "Letter";

  onMount(() => {
    chrome.storage.local.get(
      ["columns", "fontSize", "verticalMargin", "horizontalMargin", "pageSize"],
      (result) => {
        if (result["columns"] !== undefined) columns = result["columns"];
        if (result["fontSize"] !== undefined) fontSize = result["fontSize"];
        if (result["verticalMargin"] !== undefined) verticalMargin = result["verticalMargin"];
        if (result["horizontalMargin"] !== undefined) horizontalMargin = result["horizontalMargin"];
        if (result["pageSize"] !== undefined) pageSize = result["pageSize"];
      }
    );
  });

  function saveSettings() {
    chrome.storage.local.set({
      columns,
      fontSize,
      verticalMargin,
      horizontalMargin,
      pageSize,
    });
  }

  $: if (!isExtracting && !isGenerating) {
    saveSettings();
  }

  async function extractAndGeneratePDF() {
    try {
      console.log("[Popup] Starting extraction and PDF generation...");
      error = "";
      isExtracting = true;

      console.log("[Popup] Sending EXTRACT_CONTENT message to background...");
      const response = await chrome.runtime.sendMessage<
        MessageRequest,
        MessageResponse<ExtractedContent>
      >({
        type: MessageType.EXTRACT_CONTENT,
      });
      console.log("[Popup] Received extraction response:", response);

      if (!response.success) {
        console.error("[Popup] Extraction failed:", response.error);
        throw new Error(response.error || "Failed to extract content");
      }

      const extractContent = response.data;
      console.log("[Popup] Content extracted successfully:", {
        title: extractContent.title,
        contentLength: extractContent.content.length,
      });
      isExtracting = false;

      const options: PDFOptions = {
        columns,
        fontSize,
        verticalMargin,
        horizontalMargin,
        pageSize,
      };

      console.log("[Popup] Sending GENERATE_PDF message to background...");
      isGenerating = true;
      const pdfResponse = await chrome.runtime.sendMessage<
        MessageRequest,
        MessageResponse<{ htmlContent: string; title: string }>
      >({
        type: MessageType.GENERATE_PDF,
        data: { content: extractContent, options },
      });
      console.log("[Popup] Received PDF response:", pdfResponse);

      if (!pdfResponse.success) {
        console.error("[Popup] PDF generation failed:", pdfResponse.error);
        throw new Error(pdfResponse.error || "Failed to generate PDF");
      }

      const { htmlContent } = pdfResponse.data;
      console.log("[Popup] PDF HTML content received, length:", htmlContent.length);

      console.log("[Popup] Opening print window...");
      const printWindow = window.open("", "_blank", "width=800,height=600");
      if (!printWindow) {
        console.error("[Popup] Failed to open print window");
        throw new Error("Failed to open print window");
      }

      console.log("[Popup] Writing HTML to print window...");
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      console.log("[Popup] HTML written to print window");

      setTimeout(() => {
        console.log("[Popup] Triggering print dialog...");
        printWindow.print();
        setTimeout(() => {
          if (!printWindow.closed) {
            printWindow.close();
          }
        }, 1000);
      }, 500);

      success = true;
      isGenerating = false;
      console.log("[Popup] PDF generation process complete");

      setTimeout(() => {
        window.close();
      }, 2000);
    } catch (err) {
      console.error("[Popup] PDF generation error:", err);
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

  {#if !success && !isExtracting && !isGenerating}
    <div class="mb-4 space-y-3">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1"> Page Size </label>
        <select
          bind:value={pageSize}
          class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Letter">Letter (8.5" × 11")</option>
          <option value="A4">A4 (210mm × 297mm)</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Columns: {columns}
        </label>
        <input
          type="range"
          min="1"
          max="3"
          bind:value={columns}
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Font Size: {fontSize}pt
        </label>
        <input
          type="range"
          min="8"
          max="14"
          bind:value={fontSize}
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Vertical Margin: {verticalMargin}in
        </label>
        <input
          type="range"
          min="0.25"
          max="1.5"
          step="0.25"
          bind:value={verticalMargin}
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Horizontal Margin: {horizontalMargin}in
        </label>
        <input
          type="range"
          min="0.25"
          max="1.5"
          step="0.25"
          bind:value={horizontalMargin}
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  {/if}

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

  <footer class="mt-4 pt-3 border-t border-gray-200 text-center">
    <p class="text-xs text-gray-500">Extracts readable content and formats for printing</p>
  </footer>
</div>

<style>
  :global(html) {
    @apply bg-gray-100;
  }

  :global(body) {
    @apply m-0 p-0;
  }
</style>
