import { writeFile, readFile, mkdir, stat } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { existsSync } from "fs";

export class StorageService {
  private storageDir: string;

  constructor() {
    // Store PDFs in ./storage/candidates directory
    this.storageDir = join(process.cwd(), "storage", "candidates");
    this.ensureStorageDir();
  }

  private async ensureStorageDir() {
    try {
      if (!existsSync(this.storageDir)) {
        await mkdir(this.storageDir, { recursive: true });
        console.log(`✅ Created storage directory: ${this.storageDir}`);
      }
    } catch (error) {
      console.error(`❌ Error creating storage directory:`, error);
      throw error;
    }
  }

  /**
   * Store a PDF file and return the file path
   */
  async storePDF(candidateId: string, filename: string, buffer: Buffer): Promise<string> {
    await this.ensureStorageDir();

    // Generate unique filename: candidateId-originalFilename.pdf
    const fileExtension = filename.split(".").pop() || "pdf";
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storedFilename = `${candidateId}-${sanitizedFilename}`;
    const filePath = join(this.storageDir, storedFilename);

    try {
      await writeFile(filePath, buffer);
      console.log(`✅ Stored PDF: ${storedFilename}`);
      return filePath;
    } catch (error) {
      console.error(`❌ Error storing PDF:`, error);
      throw new Error(`Failed to store PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieve a PDF file by candidate ID
   */
  async getPDF(candidateId: string, filename: string): Promise<Buffer | null> {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storedFilename = `${candidateId}-${sanitizedFilename}`;
    const filePath = join(this.storageDir, storedFilename);

    try {
      // Check if file exists
      await stat(filePath);
      const buffer = await readFile(filePath);
      return buffer;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        console.log(`⚠️ PDF not found: ${storedFilename}`);
        return null;
      }
      console.error(`❌ Error reading PDF:`, error);
      throw error;
    }
  }

  /**
   * Get PDF file path (for serving)
   */
  getPDFPath(candidateId: string, filename: string): string {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storedFilename = `${candidateId}-${sanitizedFilename}`;
    return join(this.storageDir, storedFilename);
  }

  /**
   * Check if PDF exists
   */
  async pdfExists(candidateId: string, filename: string): Promise<boolean> {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storedFilename = `${candidateId}-${sanitizedFilename}`;
    const filePath = join(this.storageDir, storedFilename);

    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete a PDF file
   */
  async deletePDF(candidateId: string, filename: string): Promise<boolean> {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storedFilename = `${candidateId}-${sanitizedFilename}`;
    const filePath = join(this.storageDir, storedFilename);

    try {
      const { unlink } = await import("fs/promises");
      await unlink(filePath);
      console.log(`✅ Deleted PDF: ${storedFilename}`);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return false; // File doesn't exist
      }
      console.error(`❌ Error deleting PDF:`, error);
      throw error;
    }
  }
}
