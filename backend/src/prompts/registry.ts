import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROMPT_VERSION = "v1.0";
const PROMPTS_DIR = join(__dirname, "v1");

export function getPromptPath(version: string, promptName: string): string {
  return join(PROMPTS_DIR, `${promptName}.txt`);
}

export function loadPrompt(version: string, promptName: string): string {
  const promptPath = getPromptPath(version, promptName);
  try {
    return readFileSync(promptPath, "utf-8");
  } catch (error) {
    throw new Error(`Prompt not found: ${promptPath}`);
  }
}

export function getCurrentPrompt(promptName: string): string {
  return loadPrompt(PROMPT_VERSION, promptName);
}
