/**
 * CV Chunking Service
 * 
 * Intelligently chunks CV text into semantic sections for RAG retrieval.
 * Uses section-based chunking with overlap to preserve context.
 */

export interface CVChunk {
  text: string;
  chunkIndex: number;
  sectionType: "experience" | "education" | "skills" | "summary" | "contact" | "other";
  startChar: number;
  endChar: number;
  metadata: {
    candidateId: string;
    company?: string;
    role?: string;
    institution?: string;
    degree?: string;
  };
}

export class CVChunkingService {
  private readonly chunkSize: number = 800; // characters (not tokens)
  private readonly chunkOverlap: number = 100; // characters
  private readonly minChunkSize: number = 200; // minimum chunk size to avoid tiny chunks

  /**
   * Chunk CV text into semantic sections
   */
  chunkCV(cvText: string, candidateId: string): CVChunk[] {
    const chunks: CVChunk[] = [];
    let chunkIndex = 0;

    // Normalize text
    const normalizedText = cvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Identify major sections
    const sections = this.identifySections(normalizedText);

    for (const section of sections) {
      const sectionChunks = this.chunkSection(
        section.text,
        section.type,
        section.startChar,
        candidateId,
        chunkIndex
      );
      chunks.push(...sectionChunks);
      chunkIndex += sectionChunks.length;
    }

    // If no sections found, fallback to simple chunking
    if (chunks.length === 0) {
      return this.simpleChunking(normalizedText, candidateId);
    }

    return chunks;
  }

  /**
   * Identify major sections in CV (Experience, Education, Skills, etc.)
   */
  private identifySections(text: string): Array<{
    type: CVChunk["sectionType"];
    text: string;
    startChar: number;
    endChar: number;
  }> {
    const sections: Array<{
      type: CVChunk["sectionType"];
      text: string;
      startChar: number;
      endChar: number;
    }> = [];

    // Common section headers (case-insensitive)
    const sectionPatterns = [
      { pattern: /^(contact|personal information|personal details)/i, type: "contact" as const },
      { pattern: /^(summary|profile|objective|about)/i, type: "summary" as const },
      { pattern: /^(experience|work experience|employment|professional experience|career)/i, type: "experience" as const },
      { pattern: /^(education|academic|qualifications)/i, type: "education" as const },
      { pattern: /^(skills|technical skills|competencies|expertise)/i, type: "skills" as const },
    ];

    const lines = text.split("\n");
    let currentSection: { type: CVChunk["sectionType"]; startLine: number; startChar: number } | null = null;
    let charOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check if this line is a section header
      let matchedSection: { type: CVChunk["sectionType"] } | null = null;
      for (const { pattern, type } of sectionPatterns) {
        if (pattern.test(trimmedLine)) {
          matchedSection = { type };
          break;
        }
      }

      if (matchedSection) {
        // Save previous section if exists
        if (currentSection && i > currentSection.startLine) {
          const sectionText = lines
            .slice(currentSection.startLine, i)
            .join("\n")
            .trim();
          if (sectionText.length > 50) {
            // Only add if substantial content
            sections.push({
              type: currentSection.type,
              text: sectionText,
              startChar: currentSection.startChar,
              endChar: charOffset,
            });
          }
        }

        // Start new section
        currentSection = {
          type: matchedSection.type,
          startLine: i + 1, // Start after header
          startChar: charOffset + line.length + 1,
        };
      }

      charOffset += line.length + 1; // +1 for newline
    }

    // Add final section
    if (currentSection) {
      const sectionText = lines.slice(currentSection.startLine).join("\n").trim();
      if (sectionText.length > 50) {
        sections.push({
          type: currentSection.type,
          text: sectionText,
          startChar: currentSection.startChar,
          endChar: text.length,
        });
      }
    }

    // If no sections found, treat entire text as "other"
    if (sections.length === 0) {
      sections.push({
        type: "other",
        text: text,
        startChar: 0,
        endChar: text.length,
      });
    }

    return sections;
  }

  /**
   * Chunk a section into smaller pieces with overlap
   */
  private chunkSection(
    sectionText: string,
    sectionType: CVChunk["sectionType"],
    startChar: number,
    candidateId: string,
    startIndex: number
  ): CVChunk[] {
    const chunks: CVChunk[] = [];
    const maxChunkLength = this.chunkSize;
    const overlapLength = this.chunkOverlap;

    let currentIndex = startIndex;
    let position = 0;

    while (position < sectionText.length) {
      const chunkEnd = Math.min(position + maxChunkLength, sectionText.length);

      // Try to break at sentence or paragraph boundary
      let actualEnd = chunkEnd;
      if (chunkEnd < sectionText.length) {
        // Look for sentence boundary (., !, ?) or paragraph boundary (\n\n)
        const sentenceBoundary = sectionText.lastIndexOf(".", chunkEnd);
        const paragraphBoundary = sectionText.lastIndexOf("\n\n", chunkEnd);
        const newlineBoundary = sectionText.lastIndexOf("\n", chunkEnd);

        // Prefer paragraph, then sentence, then newline
        if (paragraphBoundary > position + maxChunkLength * 0.5) {
          actualEnd = paragraphBoundary + 2;
        } else if (sentenceBoundary > position + maxChunkLength * 0.5) {
          actualEnd = sentenceBoundary + 1;
        } else if (newlineBoundary > position + maxChunkLength * 0.5) {
          actualEnd = newlineBoundary + 1;
        }
      }

      const chunkText = sectionText.slice(position, actualEnd).trim();

      // Only create chunk if it meets minimum size (unless it's the last chunk)
      if (chunkText.length >= this.minChunkSize || actualEnd >= sectionText.length) {
        // Extract metadata based on section type
        const metadata = this.extractMetadata(chunkText, sectionType);

        chunks.push({
          text: chunkText,
          chunkIndex: currentIndex,
          sectionType,
          startChar: startChar + position,
          endChar: startChar + actualEnd,
          metadata: {
            candidateId,
            ...metadata,
          },
        });

        currentIndex++;
        
        // Move position forward with overlap
        position = Math.max(actualEnd - overlapLength, position + 1);
      } else {
        // Chunk too small, extend it or merge with next
        // Try to extend to next boundary
        const nextBoundary = sectionText.indexOf("\n\n", actualEnd);
        if (nextBoundary > 0 && nextBoundary < position + maxChunkLength * 1.5) {
          actualEnd = nextBoundary + 2;
          const extendedChunk = sectionText.slice(position, actualEnd).trim();
          if (extendedChunk.length >= this.minChunkSize) {
            const metadata = this.extractMetadata(extendedChunk, sectionType);
            chunks.push({
              text: extendedChunk,
              chunkIndex: currentIndex,
              sectionType,
              startChar: startChar + position,
              endChar: startChar + actualEnd,
              metadata: {
                candidateId,
                ...metadata,
              },
            });
            currentIndex++;
            position = Math.max(actualEnd - overlapLength, position + 1);
          } else {
            // Still too small, just skip this tiny chunk
            position = actualEnd + 1;
          }
        } else {
          // Can't extend, skip this tiny chunk
          position = actualEnd + 1;
        }
      }
    }

    return chunks;
  }

  /**
   * Extract metadata from chunk text based on section type
   */
  private extractMetadata(
    text: string,
    sectionType: CVChunk["sectionType"]
  ): Partial<CVChunk["metadata"]> {
    const metadata: Partial<CVChunk["metadata"]> = {};

    if (sectionType === "experience") {
      // Try to extract company name (common patterns)
      const companyMatch = text.match(/(?:at|@|Company:\s*)([A-Z][A-Za-z0-9\s&]+)/);
      if (companyMatch) {
        metadata.company = companyMatch[1].trim();
      }

      // Try to extract role
      const roleMatch = text.match(/(?:Role|Title|Position):\s*([^\n]+)/i);
      if (roleMatch) {
        metadata.role = roleMatch[1].trim();
      }
    } else if (sectionType === "education") {
      // Try to extract institution
      const institutionMatch = text.match(/(?:University|College|School|Institution):\s*([^\n]+)/i);
      if (institutionMatch) {
        metadata.institution = institutionMatch[1].trim();
      }

      // Try to extract degree
      const degreeMatch = text.match(/(?:Degree|Qualification):\s*([^\n]+)/i);
      if (degreeMatch) {
        metadata.degree = degreeMatch[1].trim();
      }
    }

    return metadata;
  }

  /**
   * Fallback: Simple chunking when section detection fails
   */
  private simpleChunking(cvText: string, candidateId: string): CVChunk[] {
    const chunks: CVChunk[] = [];
    const maxChunkLength = this.chunkSize;
    const overlapLength = this.chunkOverlap;

    let chunkIndex = 0;
    let position = 0;

    while (position < cvText.length) {
      const chunkEnd = Math.min(position + maxChunkLength, cvText.length);
      let actualEnd = chunkEnd;

      // Try to break at paragraph or sentence boundary
      if (chunkEnd < cvText.length) {
        const paragraphBoundary = cvText.lastIndexOf("\n\n", chunkEnd);
        const sentenceBoundary = cvText.lastIndexOf(".", chunkEnd);
        if (paragraphBoundary > position + maxChunkLength * 0.5) {
          actualEnd = paragraphBoundary + 2;
        } else if (sentenceBoundary > position + maxChunkLength * 0.5) {
          actualEnd = sentenceBoundary + 1;
        }
      }

      const chunkText = cvText.slice(position, actualEnd).trim();

      // Only create chunk if it meets minimum size (unless it's the last chunk)
      if (chunkText.length >= this.minChunkSize || actualEnd >= cvText.length) {
        chunks.push({
          text: chunkText,
          chunkIndex,
          sectionType: "other",
          startChar: position,
          endChar: actualEnd,
          metadata: {
            candidateId,
          },
        });

        chunkIndex++;
        position = Math.max(actualEnd - overlapLength, position + 1);
      } else {
        // Chunk too small, skip forward
        position = actualEnd + 1;
      }
    }

    return chunks;
  }
}
