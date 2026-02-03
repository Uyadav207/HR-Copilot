/**
 * Extract and repair JSON from LLM output (often truncated or wrapped in markdown).
 * Used by LLMClient for parsing structured responses.
 */

import { logger } from "./logger.js";

function tryParse(str: string): Record<string, unknown> | null {
  try {
    return JSON.parse(str) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Close unclosed brackets by counting braces. */
export function closeUnclosedBrackets(str: string): string {
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

/** Attempt to repair truncated JSON by closing unterminated strings and brackets. */
export function repairTruncatedJson(str: string): string {
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

/** Aggressively repair JSON by fixing common truncation issues. */
export function aggressiveJsonRepair(str: string): string {
  let fixed = str;

  fixed = fixed.replace(/,\s*"[^"]*":\s*$/g, "");
  fixed = fixed.replace(/,\s*"[^"]*"\s*$/g, "");

  const quoteCount = (fixed.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    const lastQuote = fixed.lastIndexOf('"');
    if (lastQuote > 0) {
      const beforeQuote = fixed.slice(0, lastQuote).trim();
      if (beforeQuote.endsWith(":") || beforeQuote.endsWith("[") || beforeQuote.endsWith(",")) {
        fixed = fixed + '"';
      }
    }
  }

  fixed = fixed.replace(/,(\s*[\]}])/g, "$1");
  fixed = fixed.replace(/:\s*$/g, ": null");
  fixed = fixed.replace(/,\s*$/g, "");

  return repairTruncatedJson(fixed);
}

/** Try to extract a partial but valid JSON object from the start. */
export function extractPartialJson(str: string): Record<string, unknown> | null {
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

  if (lastValidEnd > 0) {
    const partial = str.slice(0, lastValidEnd + 1);
    const result = tryParse(partial);
    if (result) return result;
  }

  for (let len = str.length; len > 100; len -= 50) {
    const substring = str.slice(0, len);
    const repaired = aggressiveJsonRepair(substring);
    const result = tryParse(repaired);
    if (result && Object.keys(result).length > 0) {
      logger.warn("jsonRepair", `Recovered partial JSON (${Object.keys(result).length} keys)`);
      return result;
    }
  }

  return null;
}

/**
 * Extract JSON object from LLM response text (may include markdown, truncation, or malformation).
 * @throws Error if no valid JSON can be extracted.
 */
export function extractJsonFromLLM(text: string): Record<string, unknown> {
  let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  let result = tryParse(cleaned);
  if (result) return result;

  const match = cleaned.match(/\{[\s\S]*/);
  if (match) {
    const candidate = match[0];
    result = tryParse(candidate);
    if (result) return result;

    result = tryParse(repairTruncatedJson(candidate));
    if (result) return result;

    result = tryParse(aggressiveJsonRepair(candidate));
    if (result) return result;

    const endings = ['",', '"},', '"]', '}]', ']}', 'true,', 'false,', 'null,'];
    for (const ending of endings) {
      const lastPos = candidate.lastIndexOf(ending);
      if (lastPos > 0) {
        for (let i = 0; i < 10; i++) {
          const truncated = candidate.slice(0, lastPos + ending.length - 1 - i).replace(/[,:\s]+$/, "");
          const closed = closeUnclosedBrackets(truncated);
          result = tryParse(closed);
          if (result) return result;
        }
      }
    }

    result = extractPartialJson(candidate);
    if (result) return result;
  }

  throw new Error("Failed to parse JSON from LLM response. Output may be truncated or malformed.");
}
