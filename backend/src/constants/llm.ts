/** LLM-related constants to avoid magic numbers. */

/** Max tokens for completion calls (e.g. evaluations) so long outputs aren't truncated. */
export const LLM_MAX_TOKENS = 8192;

/** Max characters of CV text to include in a single prompt; beyond this we truncate. */
export const MAX_CV_CHARS_FOR_PROMPT = 40_000;
