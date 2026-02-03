/**
 * Candidate Chat Service
 * 
 * Provides AI-powered Q&A about candidates with JD context using RAG.
 * Answers are based on CV chunks and job requirements.
 */

import { LLMClient } from "./llmClient.js";
import { VectorStoreService } from "./vectorStoreService.js";
import { settings } from "../config.js";
import type { RetrievedChunk } from "./vectorStoreService.js";
import { logger } from "../utils/logger.js";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatContext {
  candidateId: string;
  candidateProfile: Record<string, any>;
  jobBlueprint: Record<string, any>;
  cvChunks: RetrievedChunk[];
}

export class CandidateChatService {
  private _llmClient: LLMClient | null = null;
  private vectorStore: VectorStoreService | null;

  constructor() {
    this.vectorStore = settings.pineconeApiKey ? new VectorStoreService() : null;
  }

  private get llmClient(): LLMClient {
    if (!this._llmClient) this._llmClient = new LLMClient();
    return this._llmClient;
  }

  /**
   * Answer a question about the candidate with JD context
   */
  async answerQuestion(
    question: string,
    context: ChatContext,
    conversationHistory: ChatMessage[] = []
  ): Promise<string> {
    // Retrieve relevant chunks for the question
    let relevantChunks: RetrievedChunk[] = [];
    
    if (this.vectorStore) {
      try {
        // Search for chunks relevant to the question
        const chunks = await this.vectorStore.searchRelevantChunks(
          context.candidateId,
          question,
          5 // Top 5 most relevant chunks
        );
        relevantChunks = chunks;
      } catch (error) {
        logger.error("CandidateChatService", "Error retrieving chunks for chat", error);
        // Use existing chunks from context
        relevantChunks = context.cvChunks.slice(0, 5);
      }
    } else {
      // Fallback to context chunks
      relevantChunks = context.cvChunks.slice(0, 5);
    }

    // Format chunks for prompt
    const chunksFormatted = relevantChunks
      .map(
        (chunk) =>
          `[Chunk ${chunk.chunkIndex}] (${chunk.sectionType}):\n${chunk.text}`
      )
      .join("\n\n---\n\n");

    // Build system prompt with context
    const systemPrompt = `You are an AI assistant helping a recruiter evaluate a candidate for a job position.

Job Requirements:
${JSON.stringify(context.jobBlueprint, null, 2)}

Candidate Profile:
${JSON.stringify(context.candidateProfile, null, 2)}

Relevant CV Evidence:
${chunksFormatted || "No specific chunks found for this question."}

INSTRUCTIONS:
- Answer questions based ONLY on the provided CV chunks and candidate profile
- Reference specific chunks when providing evidence (e.g., "According to chunk-5...")
- Compare candidate qualifications against the job requirements
- Be honest about gaps or missing information
- If information isn't in the CV, say so clearly
- Keep answers concise but informative
- Always cite your sources (chunk numbers)`;

    // Build messages for conversation
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history (last 5 messages for context)
    const recentHistory = conversationHistory.slice(-5);
    recentHistory.forEach((msg) => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    // Add current question
    messages.push({
      role: "user",
      content: question,
    });

    // Call LLM using the LLMClient's internal methods
    try {
      // Access the provider and call methods directly
      const provider = (this.llmClient as any).provider;
      
      if (provider === "openai") {
        const { default: OpenAI } = await import("openai");
        const client = new OpenAI({ apiKey: settings.openaiApiKey });
        const response = await client.chat.completions.create({
          model: settings.openaiModel,
          messages: messages as any,
          temperature: 0.7,
          max_tokens: 500,
        });
        return response.choices[0]?.message?.content || "I couldn't generate a response.";
      } else if (provider === "gemini") {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
        const userContent = messages
          .filter((msg) => msg.role !== "system")
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n\n");
        const response = await ai.models.generateContent({
          model: settings.geminiModel,
          contents: userContent,
          config: { systemInstruction: systemPrompt, temperature: 0.7 },
        });
        return (response.text ?? "I couldn't generate a response.").trim();
      } else {
        // Anthropic
        const { default: Anthropic } = await import("@anthropic-ai/sdk");
        const client = new Anthropic({ apiKey: settings.anthropicApiKey });
        const response = await client.messages.create({
          model: settings.anthropicModel,
          max_tokens: 500,
          messages: messages
            .filter((msg) => msg.role !== "system")
            .map((msg) => ({
              role: msg.role as "user" | "assistant",
              content: msg.content,
            })),
          system: systemPrompt,
          temperature: 0.7,
        });
        return response.content[0]?.type === "text" ? response.content[0].text : "I couldn't generate a response.";
      }
    } catch (error) {
      logger.error("CandidateChatService", "Error generating chat response", error);
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get suggested questions based on candidate and JD
   */
  async getSuggestedQuestions(context: ChatContext): Promise<string[]> {
    const questions = [
      "What is the candidate's total years of experience?",
      "Does the candidate have the required skills for this role?",
      "What are the candidate's main strengths relevant to this job?",
      "What gaps exist between the candidate and job requirements?",
      "Has the candidate worked on similar projects before?",
      "What is the candidate's career progression?",
      "Are there any red flags in the candidate's resume?",
    ];

    // Customize questions based on JD requirements
    const blueprint = context.jobBlueprint as any;
    if (blueprint.required_skills && Array.isArray(blueprint.required_skills)) {
      const topSkills = blueprint.required_skills.slice(0, 3);
      topSkills.forEach((skill: any) => {
        const skillName = skill.skill || skill.name || String(skill);
        questions.push(`Does the candidate have ${skillName} experience?`);
      });
    }

    return questions.slice(0, 10); // Return top 10 questions
  }
}
