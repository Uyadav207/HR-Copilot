import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { settings } from "../config.js";
import type { JobBlueprint, CandidateProfile, CandidateEvaluation, EmailDraft } from "../schemas/ai.js";
import type { RetrievedChunk } from "./vectorStoreService.js";

export class LLMClient {
  private client: OpenAI | Anthropic | GoogleGenAI;
  private model: string;
  private provider: "openai" | "anthropic" | "gemini";

  constructor() {
    if (settings.llmProvider === "openai") {
      if (!settings.openaiApiKey) {
        throw new Error("OPENAI_API_KEY not set");
      }
      this.client = new OpenAI({ apiKey: settings.openaiApiKey });
      this.model = settings.openaiModel;
      this.provider = "openai";
    } else if (settings.llmProvider === "anthropic") {
      if (!settings.anthropicApiKey) {
        throw new Error("ANTHROPIC_API_KEY not set");
      }
      this.client = new Anthropic({ apiKey: settings.anthropicApiKey });
      this.model = settings.anthropicModel;
      this.provider = "anthropic";
    } else if (settings.llmProvider === "gemini") {
      if (!settings.geminiApiKey) {
        throw new Error("GEMINI_API_KEY not set");
      }
      this.client = new GoogleGenAI({ apiKey: settings.geminiApiKey });
      this.model = settings.geminiModel;
      this.provider = "gemini";
    } else {
      throw new Error(`Unsupported LLM provider: ${settings.llmProvider}`);
    }
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const client = this.client as OpenAI;
    const response = await client.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 8192, // Ensure long evaluation outputs aren't truncated
    });
    return response.choices[0]?.message?.content || "";
  }

  private async callAnthropic(prompt: string): Promise<string> {
    const client = this.client as Anthropic;
    const response = await client.messages.create({
      model: this.model,
      max_tokens: 8192, // Ensure long evaluation outputs aren't truncated
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });
    return response.content[0]?.type === "text" ? response.content[0].text : "";
  }

  private async callGemini(prompt: string): Promise<string> {
    const client = this.client as GoogleGenAI;
    const response = await client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 8192, // Ensure long evaluation outputs aren't truncated
      },
    });
    return response.text ?? "";
  }

  private async callLLM(prompt: string): Promise<string> {
    if (this.provider === "openai") return this.callOpenAI(prompt);
    if (this.provider === "anthropic") return this.callAnthropic(prompt);
    if (this.provider === "gemini") return this.callGemini(prompt);
    throw new Error(`Unsupported provider: ${this.provider}`);
  }

  private extractJson(text: string): Record<string, any> {
    // Remove markdown code blocks if present
    let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const tryParse = (str: string): Record<string, any> | null => {
      try {
        return JSON.parse(str) as Record<string, any>;
      } catch {
        return null;
      }
    };

    let result = tryParse(cleaned);
    if (result) return result;

    // Try to find JSON object in the text
    const match = cleaned.match(/\{[\s\S]*/);
    if (match) {
      let candidate = match[0];
      result = tryParse(candidate);
      if (result) return result;

      // Attempt repair for truncated JSON (common when LLM output is cut off)
      const repaired = this.repairTruncatedJson(candidate);
      result = tryParse(repaired);
      if (result) return result;

      // Try aggressive repair: fix common issues before closing brackets
      const aggressiveRepair = this.aggressiveJsonRepair(candidate);
      result = tryParse(aggressiveRepair);
      if (result) return result;

      // Fallback: try truncating from the end to find last valid JSON boundary
      // Look for various field endings
      const endings = ['",', '"},', '"]', '}]', ']}', 'true,', 'false,', 'null,'];
      for (const ending of endings) {
        const lastPos = candidate.lastIndexOf(ending);
        if (lastPos > 0) {
          for (let i = 0; i < 10; i++) {
            const truncated = candidate.slice(0, lastPos + ending.length - 1 - i).replace(/[,:\s]+$/, "");
            const closed = this.closeUnclosedBrackets(truncated);
            result = tryParse(closed);
            if (result) return result;
          }
        }
      }

      // Last resort: find the deepest valid JSON object
      result = this.extractPartialJson(candidate);
      if (result) return result;
    }

    throw new Error(`Failed to parse JSON from LLM response. Output may be truncated or malformed.`);
  }

  /** Aggressively repair JSON by fixing common truncation issues */
  private aggressiveJsonRepair(str: string): string {
    let fixed = str;
    
    // Remove trailing incomplete key-value pairs (e.g., `"key":` without value)
    fixed = fixed.replace(/,\s*"[^"]*":\s*$/g, "");
    fixed = fixed.replace(/,\s*"[^"]*"\s*$/g, "");
    
    // Fix trailing incomplete strings (e.g., `"value` without closing quote)
    // Count quotes to see if we have an odd number
    const quoteCount = (fixed.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      // Find the last quote and close the string
      const lastQuote = fixed.lastIndexOf('"');
      if (lastQuote > 0) {
        // Check if it's the start of a value
        const beforeQuote = fixed.slice(0, lastQuote).trim();
        if (beforeQuote.endsWith(":") || beforeQuote.endsWith("[") || beforeQuote.endsWith(",")) {
          fixed = fixed + '"';
        }
      }
    }
    
    // Remove trailing commas before closing brackets
    fixed = fixed.replace(/,(\s*[\]}])/g, "$1");
    
    // Remove trailing colons
    fixed = fixed.replace(/:\s*$/g, ': null');
    
    // Remove dangling commas at the end
    fixed = fixed.replace(/,\s*$/g, "");
    
    return this.repairTruncatedJson(fixed);
  }

  /** Try to extract a partial but valid JSON object from the start */
  private extractPartialJson(str: string): Record<string, any> | null {
    const tryParse = (s: string): Record<string, any> | null => {
      try {
        return JSON.parse(s) as Record<string, any>;
      } catch {
        return null;
      }
    };

    // Try to find balanced braces from the start
    let depth = 0;
    let arrayDepth = 0;
    let inString = false;
    let escape = false;
    let lastValidEnd = -1;

    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      
      if (escape) {
        escape = false;
        continue;
      }
      
      if (inString) {
        if (c === "\\") escape = true;
        else if (c === '"') inString = false;
        continue;
      }
      
      if (c === '"') {
        inString = true;
        continue;
      }
      
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0 && arrayDepth === 0) {
          lastValidEnd = i;
        }
      } else if (c === "[") arrayDepth++;
      else if (c === "]") arrayDepth--;
    }

    // If we found a valid end point, try parsing up to there
    if (lastValidEnd > 0) {
      const partial = str.slice(0, lastValidEnd + 1);
      const result = tryParse(partial);
      if (result) return result;
    }

    // Try progressively shorter substrings, looking for valid JSON
    for (let len = str.length; len > 100; len -= 50) {
      const substring = str.slice(0, len);
      const repaired = this.aggressiveJsonRepair(substring);
      const result = tryParse(repaired);
      if (result && Object.keys(result).length > 0) {
        console.warn(`⚠️ [LLMClient] Recovered partial JSON (${Object.keys(result).length} keys)`);
        return result;
      }
    }

    return null;
  }

  /** Attempt to repair truncated JSON by closing unterminated strings and brackets */
  private repairTruncatedJson(str: string): string {
    let inString = false;
    let stringChar = '"';
    let escape = false;
    let depth = 0;
    let arrayDepth = 0;

    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (inString) {
        if (c === "\\") escape = true;
        else if (c === stringChar) inString = false;
        continue;
      }
      if (c === '"' || c === "'") {
        inString = true;
        stringChar = c;
        continue;
      }
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === "[") arrayDepth++;
      else if (c === "]") arrayDepth--;
    }

    let suffix = "";
    if (inString) suffix += stringChar;
    for (let i = 0; i < arrayDepth; i++) suffix += "]";
    for (let i = 0; i < depth; i++) suffix += "}";
    return str + suffix;
  }

  /** Close unclosed brackets by counting braces */
  private closeUnclosedBrackets(str: string): string {
    let depth = 0;
    let arrayDepth = 0;
    for (const c of str) {
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === "[") arrayDepth++;
      else if (c === "]") arrayDepth--;
    }
    return str + "]".repeat(Math.max(0, arrayDepth)) + "}".repeat(Math.max(0, depth));
  }

  async parseJdToBlueprint(jobDescription: string): Promise<Record<string, any>> {
    const { getCurrentPrompt } = await import("../prompts/registry.js");
    const promptTemplate = getCurrentPrompt("jd_to_blueprint");
    const prompt = promptTemplate.replace("{job_description}", jobDescription);

    const response = await this.callLLM(prompt);

    const blueprintDict = this.extractJson(response);
    // Basic validation - JobBlueprint schema would be validated at API level
    return blueprintDict;
  }

  async parseCvToProfile(cvText: string): Promise<Record<string, any>> {
    const { getCurrentPrompt } = await import("../prompts/registry.js");
    const promptTemplate = getCurrentPrompt("cv_to_profile");
    const prompt = promptTemplate.replace("{cv_text}", cvText);

    const response = await this.callLLM(prompt);

    const profileDict = this.extractJson(response);
    return profileDict;
  }

  /**
   * Parse CV to profile using RAG (Retrieval-Augmented Generation)
   * Retrieves relevant chunks from Pinecone and requires citations for all claims
   */
  async parseCvToProfileWithRAG(
    candidateId: string,
    cvText: string,
    retrievedChunks: RetrievedChunk[]
  ): Promise<Record<string, any>> {
    const { getCurrentPrompt } = await import("../prompts/registry.js");
    
    // Format chunks for the prompt
    const chunksFormatted = retrievedChunks
      .map(
        (chunk) =>
          `[Chunk ${chunk.chunkIndex}] (Section: ${chunk.sectionType}, Score: ${chunk.score.toFixed(3)}):\n${chunk.text}`
      )
      .join("\n\n---\n\n");

    // Get RAG prompt template
    let promptTemplate: string;
    try {
      promptTemplate = getCurrentPrompt("cv_to_profile_rag");
    } catch (error) {
      // Fallback to regular prompt if RAG prompt not found
      console.warn("RAG prompt not found, falling back to regular parsing");
      return this.parseCvToProfile(cvText);
    }

    // Build prompt with chunks
    const prompt = promptTemplate
      .replace("{cv_text}", cvText)
      .replace("{relevant_chunks}", chunksFormatted || "No relevant chunks found.");

    const response = await this.callLLM(prompt);

    const profileDict = this.extractJson(response);
    
    // Validate that skills have citations
    if (profileDict.skills && Array.isArray(profileDict.skills)) {
      profileDict.skills = profileDict.skills.map((skill: any) => {
        // Ensure citation fields exist
        if (!skill.chunkId && !skill.chunkIndex) {
          console.warn(`Skill "${skill.skill}" missing citation - this should not happen with RAG`);
        }
        return skill;
      });
    }

    return profileDict;
  }

  async evaluateCandidate(
    jobBlueprint: Record<string, any>,
    candidateProfile: Record<string, any>
  ): Promise<Record<string, any>> {
    const { getCurrentPrompt } = await import("../prompts/registry.js");
    const promptTemplate = getCurrentPrompt("profile_to_evaluation");
    const prompt = promptTemplate
      .replace("{job_blueprint}", JSON.stringify(jobBlueprint, null, 2))
      .replace("{candidate_profile}", JSON.stringify(candidateProfile, null, 2));

    const response = await this.callLLM(prompt);

    const evaluationDict = this.extractJson(response);
    return evaluationDict;
  }

  /**
   * Evaluate candidate using Direct Enhanced evaluation (no vector search).
   * Uses structured candidate profile + full CV text for exact quotes/citations.
   */
  async evaluateCandidateDirectEnhanced(
    jobBlueprint: Record<string, any>,
    candidateProfile: Record<string, any>,
    cvRawText: string
  ): Promise<Record<string, any>> {
    const { getCurrentPrompt } = await import("../prompts/registry.js");

    let promptTemplate: string;
    try {
      promptTemplate = getCurrentPrompt("profile_to_evaluation_direct_enhanced");
    } catch (error) {
      // Fallback to basic direct evaluation if enhanced prompt isn't available
      console.warn(
        "Direct enhanced evaluation prompt not found, falling back to regular evaluation"
      );
      return this.evaluateCandidate(jobBlueprint, candidateProfile);
    }

    // Prevent runaway prompt sizes if CV text is extremely large
    const MAX_CV_CHARS = 40_000;
    const cvTextForPrompt =
      typeof cvRawText === "string" && cvRawText.length > MAX_CV_CHARS
        ? `${cvRawText.slice(0, MAX_CV_CHARS)}\n\n[TRUNCATED: CV text exceeded ${MAX_CV_CHARS} characters]`
        : cvRawText || "";

    const prompt = promptTemplate
      .replace("{job_blueprint}", JSON.stringify(jobBlueprint, null, 2))
      .replace("{candidate_profile}", JSON.stringify(candidateProfile, null, 2))
      .replace("{cv_raw_text}", cvTextForPrompt);

    const response = await this.callLLM(prompt);

    const evaluationDict = this.extractJson(response);
    return evaluationDict;
  }

  /**
   * Evaluate candidate using RAG (Retrieval-Augmented Generation)
   * Retrieves relevant CV chunks for each JD requirement and requires citations
   *
   * @deprecated Evaluation should use evaluateCandidateDirectEnhanced(). Keep RAG for chatbot-style Q&A only.
   */
  async evaluateCandidateWithRAG(
    jobBlueprint: Record<string, any>,
    candidateProfile: Record<string, any>,
    relevantChunks: RetrievedChunk[]
  ): Promise<Record<string, any>> {
    const { getCurrentPrompt } = await import("../prompts/registry.js");
    
    // Format chunks for the prompt
    const chunksFormatted = relevantChunks
      .map(
        (chunk) =>
          `[Chunk ${chunk.chunkIndex}] (Section: ${chunk.sectionType}, Score: ${chunk.score.toFixed(3)}):\n${chunk.text}`
      )
      .join("\n\n---\n\n");

    // Get RAG prompt template
    let promptTemplate: string;
    try {
      promptTemplate = getCurrentPrompt("profile_to_evaluation_rag");
    } catch (error) {
      // Fallback to regular evaluation if RAG prompt not found
      console.warn("RAG evaluation prompt not found, falling back to regular evaluation");
      return this.evaluateCandidate(jobBlueprint, candidateProfile);
    }

    // Build prompt with chunks
    const prompt = promptTemplate
      .replace("{job_blueprint}", JSON.stringify(jobBlueprint, null, 2))
      .replace("{candidate_profile}", JSON.stringify(candidateProfile, null, 2))
      .replace("{relevant_cv_chunks}", chunksFormatted || "No relevant chunks found.");

    const response = await this.callLLM(prompt);

    const evaluationDict = this.extractJson(response);
    
    // Validate that evidence has citations
    if (evaluationDict.criteria_matches && Array.isArray(evaluationDict.criteria_matches)) {
      evaluationDict.criteria_matches = evaluationDict.criteria_matches.map((match: any) => {
        if (match.evidence && Array.isArray(match.evidence)) {
          match.evidence = match.evidence.map((ev: any) => {
            if (!ev.chunkId && !ev.chunkIndex) {
              console.warn(`Evidence for criterion "${match.criterion}" missing citation - this should not happen with RAG`);
            }
            return ev;
          });
        }
        return match;
      });
    }

    return evaluationDict;
  }

  /**
   * Evaluate candidate using Enhanced RAG (with brutal detailed analysis)
   *
   * @deprecated Evaluation should use evaluateCandidateDirectEnhanced(). Keep RAG for chatbot-style Q&A only.
   */
  async evaluateCandidateWithRAGEnhanced(
    jobBlueprint: Record<string, any>,
    candidateProfile: Record<string, any>,
    relevantChunks: RetrievedChunk[]
  ): Promise<Record<string, any>> {
    const { getCurrentPrompt } = await import("../prompts/registry.js");
    
    // Format chunks for the prompt
    const chunksFormatted = relevantChunks
      .map(
        (chunk) =>
          `[Chunk ${chunk.chunkIndex}] (Section: ${chunk.sectionType}, Score: ${chunk.score.toFixed(3)}):\n${chunk.text}`
      )
      .join("\n\n---\n\n");

    // Get enhanced RAG prompt template
    let promptTemplate: string;
    try {
      promptTemplate = getCurrentPrompt("profile_to_evaluation_rag_enhanced");
    } catch (error) {
      // Fallback to regular RAG evaluation
      console.warn("Enhanced RAG evaluation prompt not found, falling back to regular RAG");
      return this.evaluateCandidateWithRAG(jobBlueprint, candidateProfile, relevantChunks);
    }

    // Build prompt with chunks
    const prompt = promptTemplate
      .replace("{job_blueprint}", JSON.stringify(jobBlueprint, null, 2))
      .replace("{candidate_profile}", JSON.stringify(candidateProfile, null, 2))
      .replace("{relevant_cv_chunks}", chunksFormatted || "No relevant chunks found.");

    const response = await this.callLLM(prompt);

    const evaluationDict = this.extractJson(response);
    
    // Validate citations
    if (evaluationDict.criteria_matches && Array.isArray(evaluationDict.criteria_matches)) {
      evaluationDict.criteria_matches = evaluationDict.criteria_matches.map((match: any) => {
        if (match.evidence && Array.isArray(match.evidence)) {
          match.evidence = match.evidence.map((ev: any) => {
            if (!ev.chunkId && !ev.chunkIndex) {
              console.warn(`Evidence for criterion "${match.criterion}" missing citation`);
            }
            return ev;
          });
        }
        return match;
      });
    }

    return evaluationDict;
  }

  async generateEmail(
    emailType: string,
    jobTitle: string,
    candidateName: string,
    evaluationSummary: string,
    keyStrengths?: string | null,
    mainConcerns?: string | null,
    holdReason?: string | null,
    hiringManager?: string | null,
    jobRequirements?: string | null,
    candidateExperience?: string | null
  ): Promise<Record<string, any>> {
    const { getCurrentPrompt } = await import("../prompts/registry.js");

    let promptTemplate: string;
    let prompt: string;

    if (emailType === "invite") {
      promptTemplate = getCurrentPrompt("email_invite");
      prompt = promptTemplate
        .replace("{job_title}", jobTitle)
        .replace("{candidate_name}", candidateName)
        .replace("{evaluation_summary}", evaluationSummary)
        .replace("{key_strengths}", keyStrengths || "Strong candidate")
        .replace("{hiring_manager}", hiringManager || "Hiring Manager");
    } else if (emailType === "reject") {
      promptTemplate = getCurrentPrompt("email_reject");
      // For rejection, provide comprehensive feedback
      const concernsText = mainConcerns || "Not the right fit at this time";
      prompt = promptTemplate
        .replace("{job_title}", jobTitle)
        .replace("{candidate_name}", candidateName)
        .replace("{job_requirements}", jobRequirements || "Requirements not specified")
        .replace("{candidate_experience}", candidateExperience || "Experience not specified")
        .replace("{main_concerns}", concernsText);
    } else if (emailType === "hold") {
      promptTemplate = getCurrentPrompt("email_hold");
      prompt = promptTemplate
        .replace("{job_title}", jobTitle)
        .replace("{candidate_name}", candidateName)
        .replace("{evaluation_summary}", evaluationSummary)
        .replace("{hold_reason}", holdReason || "We're still evaluating candidates");
    } else {
      throw new Error(`Invalid email type: ${emailType}`);
    }

    const response = await this.callLLM(prompt);

    const emailDict = this.extractJson(response);
    return emailDict;
  }

  async generateJobDescription(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    jobTitle?: string
  ): Promise<string> {
    let systemPrompt = `You are an expert HR assistant helping to create professional job descriptions. 
Generate comprehensive, well-structured job descriptions based on the user's requirements.
The job description should include:
- Clear job title and overview
- Key responsibilities
- Required qualifications and skills
- Preferred experience
- Company culture and benefits (if mentioned)
- Any other relevant details

Format the response as a complete, professional job description that can be used directly.`;

    if (jobTitle) {
      systemPrompt += `\n\nThe job title is: ${jobTitle}`;
    }

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history
    if (conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Add current message
    messages.push({ role: "user", content: message });

    // Call LLM based on provider
    if (this.provider === "openai") {
      const client = this.client as OpenAI;
      const response = await client.chat.completions.create({
        model: this.model,
        messages: messages as any,
        temperature: 0.7,
      });
      return response.choices[0]?.message?.content?.trim() || "";
    } else if (this.provider === "anthropic") {
      const client = this.client as Anthropic;
      const response = await client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: messages
          .filter((msg) => msg.role !== "system")
          .map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
        system: systemPrompt,
        temperature: 0.7,
      });
      return response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    } else {
      // Gemini
      const client = this.client as GoogleGenAI;
      const userContent = messages
        .filter((msg) => msg.role !== "system")
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n\n");
      const response = await client.models.generateContent({
        model: this.model,
        contents: userContent,
        config: { systemInstruction: systemPrompt, temperature: 0.7 },
      });
      return (response.text ?? "").trim();
    }
  }

  async *generateJobDescriptionStream(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    jobTitle?: string
  ): AsyncGenerator<{ type: 'title' | 'description'; content: string }, void, unknown> {
    let systemPrompt = `You are an expert HR assistant helping to create professional job descriptions. 
Generate comprehensive, well-structured job descriptions based on the user's requirements.

IMPORTANT: You must respond in JSON format with two fields:
1. "title": A professional job title based on the user's requirements. If the user provides instructions about the title in the job title field, use those instructions to generate an appropriate title.
2. "description": A complete, professional job description in MDX (Markdown) format that includes:
   - Clear overview
   - Key responsibilities (use bullet points with - or *)
   - Required qualifications and skills (use bullet points)
   - Preferred experience (use bullet points)
   - Company culture and benefits (if mentioned, use bullet points)
   - Any other relevant details

Use MDX/Markdown formatting:
- Use ## for section headings (e.g., ## Overview, ## Responsibilities, ## Requirements)
- Use - or * for bullet points
- Use **bold** for emphasis
- Use proper line breaks between sections
- Keep it well-structured and easy to edit

Format your response as valid JSON: {"title": "...", "description": "..."}`;

    if (jobTitle && jobTitle.trim()) {
      systemPrompt += `\n\nThe user has provided the following job title or instructions: "${jobTitle}". Use this to inform the title generation. If it's instructions, generate an appropriate title based on those instructions. If it's already a title, you may refine it or use it as-is if appropriate.`;
    }

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history
    if (conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Add current message
    messages.push({ role: "user", content: message });

    // Call LLM based on provider with streaming
    if (this.provider === "openai") {
      const client = this.client as OpenAI;
      const stream = await client.chat.completions.create({
        model: this.model,
        messages: messages as any,
        temperature: 0.7,
        stream: true,
      });

      let fullContent = "";
      let lastTitle = "";
      let lastDescription = "";
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullContent += content;
          
          // Try to parse JSON as it streams
          try {
            // Look for complete JSON object
            const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.title && parsed.title !== lastTitle) {
                  lastTitle = parsed.title;
                  yield { type: 'title' as const, content: parsed.title };
                }
                if (parsed.description && parsed.description !== lastDescription) {
                  lastDescription = parsed.description;
                  yield { type: 'description' as const, content: parsed.description };
                }
              } catch {
                // JSON might not be complete yet
              }
            }
          } catch {
            // Not complete JSON yet, continue streaming
          }
        }
      }

      // Final parse attempt
      try {
        const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.title && parsed.title !== lastTitle) {
            yield { type: 'title' as const, content: parsed.title };
          }
          if (parsed.description && parsed.description !== lastDescription) {
            yield { type: 'description' as const, content: parsed.description };
          }
        } else {
          // Fallback: treat entire response as description
          if (fullContent.trim() && fullContent.trim() !== lastDescription) {
            yield { type: 'description' as const, content: fullContent.trim() };
          }
        }
      } catch {
        // Fallback: treat entire response as description
        if (fullContent.trim() && fullContent.trim() !== lastDescription) {
          yield { type: 'description' as const, content: fullContent.trim() };
        }
      }
    } else if (this.provider === "anthropic") {
      // Anthropic streaming
      const client = this.client as Anthropic;
      const stream = await client.messages.stream({
        model: this.model,
        max_tokens: 4096,
        messages: messages
          .filter((msg) => msg.role !== "system")
          .map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
        system: systemPrompt,
        temperature: 0.7,
      });

      let fullContent = "";
      let lastTitle = "";
      let lastDescription = "";
      
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          const content = chunk.delta.text || "";
          if (content) {
            fullContent += content;
            // Try to parse JSON as it streams
            try {
              const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  const parsed = JSON.parse(jsonMatch[0]);
                  if (parsed.title && parsed.title !== lastTitle) {
                    lastTitle = parsed.title;
                    yield { type: 'title' as const, content: parsed.title };
                  }
                  if (parsed.description && parsed.description !== lastDescription) {
                    lastDescription = parsed.description;
                    yield { type: 'description' as const, content: parsed.description };
                  }
                } catch {
                  // JSON might not be complete yet
                }
              }
            } catch {
              // Not complete JSON yet, continue streaming
            }
          }
        }
      }

      // Final parse attempt
      try {
        const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.title && parsed.title !== lastTitle) {
            yield { type: 'title' as const, content: parsed.title };
          }
          if (parsed.description && parsed.description !== lastDescription) {
            yield { type: 'description' as const, content: parsed.description };
          }
        } else {
          // Fallback: treat entire response as description
          if (fullContent.trim() && fullContent.trim() !== lastDescription) {
            yield { type: 'description' as const, content: fullContent.trim() };
          }
        }
      } catch {
        // Fallback: treat entire response as description
        if (fullContent.trim() && fullContent.trim() !== lastDescription) {
          yield { type: 'description' as const, content: fullContent.trim() };
        }
      }
    } else {
      // Gemini streaming
      const client = this.client as GoogleGenAI;
      const userContent = messages
        .filter((msg) => msg.role !== "system")
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n\n");
      const stream = await client.models.generateContentStream({
        model: this.model,
        contents: userContent,
        config: { systemInstruction: systemPrompt, temperature: 0.7 },
      });

      let fullContent = "";
      let lastTitle = "";
      let lastDescription = "";

      for await (const chunk of stream) {
        const content = chunk.text ?? "";
        if (content) {
          fullContent += content;
          try {
            const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.title && parsed.title !== lastTitle) {
                  lastTitle = parsed.title;
                  yield { type: "title" as const, content: parsed.title };
                }
                if (parsed.description && parsed.description !== lastDescription) {
                  lastDescription = parsed.description;
                  yield { type: "description" as const, content: parsed.description };
                }
              } catch {
                /* JSON not complete yet */
              }
            }
          } catch {
            /* continue */
          }
        }
      }

      try {
        const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.title && parsed.title !== lastTitle) {
            yield { type: "title" as const, content: parsed.title };
          }
          if (parsed.description && parsed.description !== lastDescription) {
            yield { type: "description" as const, content: parsed.description };
          }
        } else if (fullContent.trim() && fullContent.trim() !== lastDescription) {
          yield { type: "description" as const, content: fullContent.trim() };
        }
      } catch {
        if (fullContent.trim() && fullContent.trim() !== lastDescription) {
          yield { type: "description" as const, content: fullContent.trim() };
        }
      }
    }
  }
}
