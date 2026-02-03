/**
 * Prompt versioning and loading. Prompts live in v1/*.txt; placeholders like {job_description}
 * are replaced by callers (e.g. LLMClient). Use getCurrentPrompt for the active version.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Active prompt version (directory name under prompts/). */
export const PROMPT_VERSION = "v1.0";
const PROMPTS_DIR = join(__dirname, "v1");

export function getPromptPath(version: string, promptName: string): string {
  return join(PROMPTS_DIR, `${promptName}.txt`);
}

/** Loads raw prompt text from the versioned file. */
export function loadPrompt(version: string, promptName: string): string {
  const promptPath = getPromptPath(version, promptName);
  try {
    return readFileSync(promptPath, "utf-8");
  } catch (error) {
    throw new Error(`Prompt not found: ${promptPath}`);
  }
}

/** Returns the prompt template for the current version (e.g. jd_to_blueprint, cv_to_profile). */
export function getCurrentPrompt(promptName: string): string {
  return loadPrompt(PROMPT_VERSION, promptName);
}
