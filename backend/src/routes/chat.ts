import { Hono } from "hono";
import { CandidateChatService } from "../services/candidateChatService.js";
import { db } from "../database.js";
import { candidates } from "../models/candidate.js";
import { jobs } from "../models/job.js";
import { eq } from "drizzle-orm";
import { VectorStoreService } from "../services/vectorStoreService.js";
import { settings } from "../config.js";
import OpenAI from "openai";

const chat = new Hono();
const chatService = new CandidateChatService();

/**
 * POST /api/candidates/:candidateId/chat
 * Send a message to the candidate chat bot
 */
chat.post("/candidates/:candidateId/chat", async (c) => {
  const candidateId = c.req.param("candidateId");
  
  try {
    const body = await c.req.json();
    const { question, conversation_history = [] } = body;

    if (!question || typeof question !== "string") {
      return c.json({ error: "question is required and must be a string" }, 400);
    }

    // Get candidate and job data
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, candidateId));
    if (!candidate) {
      return c.json({ error: "Candidate not found" }, 404);
    }

    if (!candidate.profile) {
      return c.json({ error: "Candidate profile not parsed yet" }, 400);
    }

    const [job] = await db.select().from(jobs).where(eq(jobs.id, candidate.jobId));
    if (!job || !job.blueprint) {
      return c.json({ error: "Job blueprint not available" }, 400);
    }

    // Get relevant CV chunks
    let cvChunks: any[] = [];
    if (settings.pineconeApiKey) {
      try {
        const vectorStore = new VectorStoreService();
        // Get general chunks for context
        cvChunks = await vectorStore.searchRelevantChunks(
          candidateId,
          "skills experience qualifications work history",
          10
        );
      } catch (error) {
        console.error("Error retrieving chunks for chat:", error);
        // Continue without chunks
      }
    }

    // Prepare chat context
    const context = {
      candidateId,
      candidateProfile: candidate.profile,
      jobBlueprint: job.blueprint,
      cvChunks,
    };

    // Get answer
    const answer = await chatService.answerQuestion(question, context, conversation_history);

    return c.json({
      answer,
      question,
    });
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Failed to process chat message" },
      500
    );
  }
});

/**
 * POST /api/candidates/:candidateId/chat/stream
 * Streams the assistant answer via Server-Sent Events (SSE).
 *
 * Frontend consumes this to show "typing" behavior.
 */
chat.post("/candidates/:candidateId/chat/stream", async (c) => {
  const candidateId = c.req.param("candidateId");

  const headers = new Headers({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  const encoder = new TextEncoder();
  const sendEvent = (controller: ReadableStreamDefaultController, event: string, data: any) => {
    controller.enqueue(encoder.encode(`event: ${event}\n`));
    controller.enqueue(encoder.encode(`data: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`));
  };

  // Build stream response immediately; do async work inside
  const stream = new ReadableStream({
    start(controller) {
      (async () => {
        try {
          const body = await c.req.json();
          const { question, conversation_history = [] } = body;

          if (!question || typeof question !== "string") {
            sendEvent(controller, "error", "question is required and must be a string");
            controller.close();
            return;
          }

          const [candidate] = await db.select().from(candidates).where(eq(candidates.id, candidateId));
          if (!candidate) {
            sendEvent(controller, "error", "Candidate not found");
            controller.close();
            return;
          }
          if (!candidate.profile) {
            sendEvent(controller, "error", "Candidate profile not parsed yet");
            controller.close();
            return;
          }

          const [job] = await db.select().from(jobs).where(eq(jobs.id, candidate.jobId));
          if (!job || !job.blueprint) {
            sendEvent(controller, "error", "Job blueprint not available");
            controller.close();
            return;
          }

          // Retrieve some chunks for grounding (RAG stays for chatbot)
          let cvChunks: any[] = [];
          if (settings.pineconeApiKey) {
            try {
              const vectorStore = new VectorStoreService();
              cvChunks = await vectorStore.searchRelevantChunks(candidateId, question, 8);
            } catch (error) {
              // continue without chunks
            }
          }

          const chunksFormatted = (cvChunks || [])
            .map((chunk) => `[Chunk ${chunk.chunkIndex}] (${chunk.sectionType}):\n${chunk.text}`)
            .join("\n\n---\n\n");

          const systemPrompt = `You are an AI assistant helping a recruiter evaluate a candidate for a job position.

Job Requirements:
${JSON.stringify(job.blueprint, null, 2)}

Candidate Profile:
${JSON.stringify(candidate.profile, null, 2)}

Relevant CV Evidence:
${chunksFormatted || "No specific chunks found for this question."}

INSTRUCTIONS:
- Answer questions based ONLY on the provided CV chunks and candidate profile
- Reference specific chunks when providing evidence (e.g., "According to chunk-5...")
- Compare candidate qualifications against the job requirements
- Be honest about gaps or missing information
- If information isn't in the CV, say so clearly
- Keep answers concise but informative
- Always cite your sources (chunk numbers)
- Use Markdown formatting (headings, bullet points) for readability`;

          const messages: Array<{ role: string; content: string }> = [{ role: "system", content: systemPrompt }];
          const recentHistory = Array.isArray(conversation_history)
            ? conversation_history.slice(-5)
            : [];

          for (const msg of recentHistory) {
            if (!msg || (msg.role !== "user" && msg.role !== "assistant") || typeof msg.content !== "string") continue;
            messages.push({ role: msg.role, content: msg.content });
          }
          messages.push({ role: "user", content: question });

          // Stream with OpenAI if configured
          if (settings.llmProvider === "openai") {
            const client = new OpenAI({ apiKey: settings.openaiApiKey });
            const completion = await client.chat.completions.create({
              model: settings.openaiModel,
              messages: messages as any,
              temperature: 0.7,
              max_tokens: 600,
              stream: true,
            });

            for await (const part of completion as any) {
              const delta = part?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length > 0) {
                sendEvent(controller, "message", { delta });
              }
            }

            sendEvent(controller, "done", {});
            controller.close();
            return;
          }

          // Stream with Gemini if configured
          if (settings.llmProvider === "gemini" && settings.geminiApiKey) {
            const { GoogleGenAI } = await import("@google/genai");
            const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
            const userContent = messages
              .filter((m) => m.role !== "system")
              .map((m) => `${m.role}: ${m.content}`)
              .join("\n\n");
            const stream = await ai.models.generateContentStream({
              model: settings.geminiModel,
              contents: userContent,
              config: { systemInstruction: systemPrompt, temperature: 0.7 },
            });
            for await (const chunk of stream) {
              const delta = chunk.text ?? "";
              if (delta) {
                sendEvent(controller, "message", { delta });
              }
            }
            sendEvent(controller, "done", {});
            controller.close();
            return;
          }

          // Anthropic or other: one-shot fallback (still sent as a single streamed chunk)
          const context = {
            candidateId,
            candidateProfile: candidate.profile,
            jobBlueprint: job.blueprint,
            cvChunks,
          };
          const answer = await chatService.answerQuestion(question, context, recentHistory);
          sendEvent(controller, "message", { delta: answer });
          sendEvent(controller, "done", {});
          controller.close();
        } catch (error) {
          sendEvent(
            controller,
            "error",
            error instanceof Error ? error.message : "Failed to process chat message"
          );
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, { headers });
});

/**
 * GET /api/candidates/:candidateId/chat/suggestions
 * Get suggested questions for the candidate
 */
chat.get("/candidates/:candidateId/chat/suggestions", async (c) => {
  const candidateId = c.req.param("candidateId");

  try {
    // Get candidate and job data
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, candidateId));
    if (!candidate) {
      return c.json({ error: "Candidate not found" }, 404);
    }

    if (!candidate.profile) {
      return c.json({ error: "Candidate profile not parsed yet" }, 400);
    }

    const [job] = await db.select().from(jobs).where(eq(jobs.id, candidate.jobId));
    if (!job || !job.blueprint) {
      return c.json({ error: "Job blueprint not available" }, 400);
    }

    // Get relevant CV chunks
    let cvChunks: any[] = [];
    if (settings.pineconeApiKey) {
      try {
        const vectorStore = new VectorStoreService();
        cvChunks = await vectorStore.searchRelevantChunks(
          candidateId,
          "skills experience qualifications",
          5
        );
      } catch (error) {
        // Continue without chunks
      }
    }

    // Prepare context
    const context = {
      candidateId,
      candidateProfile: candidate.profile,
      jobBlueprint: job.blueprint,
      cvChunks,
    };

    // Get suggested questions
    const questions = await chatService.getSuggestedQuestions(context);

    return c.json({ questions });
  } catch (error) {
    console.error("Error getting chat suggestions:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Failed to get suggestions" },
      500
    );
  }
});

export default chat;
