import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { settings } from "../config.js";
import type { RetrievedChunk } from "./vectorStoreService.js";
import { extractJsonFromLLM } from "../utils/jsonRepair.js";
import { LLM_MAX_TOKENS, MAX_CV_CHARS_FOR_PROMPT } from "../constants/llm.js";
import { logger } from "../utils/logger.js";

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
      max_tokens: LLM_MAX_TOKENS,
    });
    return response.choices[0]?.message?.content || "";
  }

  private async callAnthropic(prompt: string): Promise<string> {
    const client = this.client as Anthropic;
    const response = await client.messages.create({
      model: this.model,
      max_tokens: LLM_MAX_TOKENS,
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
        maxOutputTokens: LLM_MAX_TOKENS,
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

  async parseJdToBlueprint(jobDescription: string): Promise<Record<string, any>> {
    const { getCurrentPrompt } = await import("../prompts/registry.js");
    const promptTemplate = getCurrentPrompt("jd_to_blueprint");
    const prompt = promptTemplate.replace("{job_description}", jobDescription);

    const response = await this.callLLM(prompt);

    const blueprintDict = extractJsonFromLLM(response) as Record<string, unknown>;
    // Basic validation - JobBlueprint schema would be validated at API level
    return blueprintDict;
  }

  async parseCvToProfile(cvText: string): Promise<Record<string, any>> {
    const { getCurrentPrompt } = await import("../prompts/registry.js");
    const promptTemplate = getCurrentPrompt("cv_to_profile");
    const prompt = promptTemplate.replace("{cv_text}", cvText);

    const response = await this.callLLM(prompt);

    const profileDict = extractJsonFromLLM(response) as Record<string, unknown>;
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
      logger.warn("LLMClient", "RAG prompt not found, falling back to regular parsing");
      return this.parseCvToProfile(cvText);
    }

    // Build prompt with chunks
    const prompt = promptTemplate
      .replace("{cv_text}", cvText)
      .replace("{relevant_chunks}", chunksFormatted || "No relevant chunks found.");

    const response = await this.callLLM(prompt);

    const profileDict = extractJsonFromLLM(response) as Record<string, unknown>;

    if (profileDict.skills && Array.isArray(profileDict.skills)) {
      profileDict.skills = (profileDict.skills as Array<Record<string, unknown>>).map((skill) => {
        if (!(skill as Record<string, unknown>).chunkId && !(skill as Record<string, unknown>).chunkIndex) {
          // RAG should include citations; log if missing
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

    const evaluationDict = extractJsonFromLLM(response) as Record<string, unknown>;
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
      logger.warn("LLMClient", "Direct enhanced evaluation prompt not found, falling back to regular evaluation");
      return this.evaluateCandidate(jobBlueprint, candidateProfile);
    }

    const cvTextForPrompt =
      typeof cvRawText === "string" && cvRawText.length > MAX_CV_CHARS_FOR_PROMPT
        ? `${cvRawText.slice(0, MAX_CV_CHARS_FOR_PROMPT)}\n\n[TRUNCATED: CV text exceeded ${MAX_CV_CHARS_FOR_PROMPT} characters]`
        : cvRawText || "";

    const prompt = promptTemplate
      .replace("{job_blueprint}", JSON.stringify(jobBlueprint, null, 2))
      .replace("{candidate_profile}", JSON.stringify(candidateProfile, null, 2))
      .replace("{cv_raw_text}", cvTextForPrompt);

    const response = await this.callLLM(prompt);

    const evaluationDict = extractJsonFromLLM(response) as Record<string, unknown>;
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
      logger.warn("LLMClient", "RAG evaluation prompt not found, falling back to regular evaluation");
      return this.evaluateCandidate(jobBlueprint, candidateProfile);
    }

    // Build prompt with chunks
    const prompt = promptTemplate
      .replace("{job_blueprint}", JSON.stringify(jobBlueprint, null, 2))
      .replace("{candidate_profile}", JSON.stringify(candidateProfile, null, 2))
      .replace("{relevant_cv_chunks}", chunksFormatted || "No relevant chunks found.");

    const response = await this.callLLM(prompt);

    const evaluationDict = extractJsonFromLLM(response) as Record<string, unknown>;

    if (evaluationDict.criteria_matches && Array.isArray(evaluationDict.criteria_matches)) {
      evaluationDict.criteria_matches = (evaluationDict.criteria_matches as Array<Record<string, unknown>>).map((match) => {
        if (match.evidence && Array.isArray(match.evidence)) {
          match.evidence = (match.evidence as Array<Record<string, unknown>>).map((ev) => {
            if (!ev.chunkId && !ev.chunkIndex) {
              // RAG should include citations
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
      logger.warn("LLMClient", "Enhanced RAG evaluation prompt not found, falling back to regular RAG");
      return this.evaluateCandidateWithRAG(jobBlueprint, candidateProfile, relevantChunks);
    }

    // Build prompt with chunks
    const prompt = promptTemplate
      .replace("{job_blueprint}", JSON.stringify(jobBlueprint, null, 2))
      .replace("{candidate_profile}", JSON.stringify(candidateProfile, null, 2))
      .replace("{relevant_cv_chunks}", chunksFormatted || "No relevant chunks found.");

    const response = await this.callLLM(prompt);

    const evaluationDict = extractJsonFromLLM(response) as Record<string, unknown>;

    if (evaluationDict.criteria_matches && Array.isArray(evaluationDict.criteria_matches)) {
      evaluationDict.criteria_matches = (evaluationDict.criteria_matches as Array<Record<string, unknown>>).map((match) => {
        if (match.evidence && Array.isArray(match.evidence)) {
          (match.evidence as Array<Record<string, unknown>>).forEach((ev) => {
            if (!ev.chunkId && !ev.chunkIndex) {
              // Citation missing for evidence
            }
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

    const emailDict = extractJsonFromLLM(response) as Record<string, unknown>;
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
