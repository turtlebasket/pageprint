export interface ExtractedContent {
  title: string;
  content: string;
  byline: string;
  excerpt: string;
  dir: string;
  siteName: string;
  lang: string;
}

export enum MessageType {
  EXTRACT_CONTENT = "EXTRACT_CONTENT",
  FETCH_IMAGE_DATA = "FETCH_IMAGE_DATA",
  GENERATE_PDF = "GENERATE_PDF",
  PRINT = "PRINT",
  CHECK_READABILITY = "CHECK_READABILITY",
}

export type MessageRequest =
  | { type: MessageType.EXTRACT_CONTENT }
  | {
      type: MessageType.FETCH_IMAGE_DATA;
      data: { pageUrl: string; url: string };
    }
  | {
      type: MessageType.GENERATE_PDF;
      data: { content: ExtractedContent; options?: PDFOptions };
    }
  | { type: MessageType.PRINT }
  | { type: MessageType.CHECK_READABILITY };

export type MessageResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

export type LinkHandling = "none" | "embed" | "references";

export interface PDFOptions {
  columns?: number;
  fontSize?: number;
  verticalMargin?: number;
  horizontalMargin?: number;
  showByline?: boolean;
  showExcerpt?: boolean;
  pageSize?: "A4" | "Letter";
  linkHandling?: LinkHandling;
}
