import pdfParse from "pdf-parse";

export class PDFParser {
  static async extractText(fileContent: Buffer, filename: string): Promise<string> {
    try {
      const data = await pdfParse(fileContent);
      
      // Format with page numbers if multiple pages
      const pages: string[] = [];
      if (data.numpages > 1) {
        // pdf-parse doesn't provide per-page text, so we'll just return all text
        // with a note about page count
        const text = data.text;
        if (text.trim()) {
          pages.push(text);
        }
      } else {
        pages.push(data.text);
      }

      if (pages.length === 0) {
        throw new Error("No text extracted from PDF");
      }

      return pages.join("\n\n");
    } catch (error) {
      throw new Error(
        `Failed to parse PDF ${filename}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
