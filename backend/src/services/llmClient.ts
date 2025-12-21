import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { settings } from "../config.js";
import type { JobBlueprint, CandidateProfile, CandidateEvaluation, EmailDraft } from "../schemas/ai.js";
import type { RetrievedChunk } from "./vectorStoreService.js";

export class LLMClient {
  private client: OpenAI | Anthropic;
  private model: string;
  private provider: "openai" | "anthropic";

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
    });
    return response.choices[0]?.message?.content || "";
  }

  private async callAnthropic(prompt: string): Promise<string> {
    const client = this.client as Anthropic;
    const response = await client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });
    return response.content[0]?.type === "text" ? response.content[0].text : "";
  }

  private extractJson(text: string): Record<string, any> {
    // Remove markdown code blocks if present
    let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Try to find JSON object in the text
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          throw new Error(`Failed to parse JSON from LLM response: ${e}`);
        }
      }
      throw new Error(`Failed to parse JSON from LLM response: ${e}`);
    }
  }

  async parseJdToBlueprint(jobDescription: string): Promise<Record<string, any>> {
    const { getCurrentPrompt } = await import("../prompts/registry.js");
    const promptTemplate = getCurrentPrompt("jd_to_blueprint");
    const prompt = promptTemplate.replace("{job_description}", jobDescription);

    const response =
      this.provider === "openai"
        ? await this.callOpenAI(prompt)
        : await this.callAnthropic(prompt);

    const blueprintDict = this.extractJson(response);
    // Basic validation - JobBlueprint schema would be validated at API level
    return blueprintDict;
  }

  async parseCvToProfile(cvText: string): Promise<Record<string, any>> {
    const { getCurrentPrompt } = await import("../prompts/registry.js");
    const promptTemplate = getCurrentPrompt("cv_to_profile");
    const prompt = promptTemplate.replace("{cv_text}", cvText);

    const response =
      this.provider === "openai"
        ? await this.callOpenAI(prompt)
        : await this.callAnthropic(prompt);

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

    const response =
      this.provider === "openai"
        ? await this.callOpenAI(prompt)
        : await this.callAnthropic(prompt);

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

    const response =
      this.provider === "openai"
        ? await this.callOpenAI(prompt)
        : await this.callAnthropic(prompt);

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

    const response =
      this.provider === "openai"
        ? await this.callOpenAI(prompt)
        : await this.callAnthropic(prompt);

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

    const response =
      this.provider === "openai"
        ? await this.callOpenAI(prompt)
        : await this.callAnthropic(prompt);

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

    const response =
      this.provider === "openai"
        ? await this.callOpenAI(prompt)
        : await this.callAnthropic(prompt);

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

    const response =
      this.provider === "openai"
        ? await this.callOpenAI(prompt)
        : await this.callAnthropic(prompt);

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
    } else {
      // Anthropic
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
    }
  }
}
