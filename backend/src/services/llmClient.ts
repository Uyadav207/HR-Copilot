import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { settings } from "../config.js";
import type { JobBlueprint, CandidateProfile, CandidateEvaluation, EmailDraft } from "../schemas/ai.js";

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

  async generateEmail(
    emailType: string,
    jobTitle: string,
    candidateName: string,
    evaluationSummary: string,
    keyStrengths?: string | null,
    mainConcerns?: string | null,
    holdReason?: string | null,
    hiringManager?: string | null
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
        .replace("{evaluation_summary}", evaluationSummary)
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
