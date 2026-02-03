/**
 * Simple structured logger for the backend.
 * Use instead of console.log/warn/error for consistent formatting and future log-level control.
 */

const LOG_LEVEL = (process.env.LOG_LEVEL || "INFO").toUpperCase();
const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 } as const;
const currentLevel = LEVELS[LOG_LEVEL as keyof typeof LEVELS] ?? LEVELS.INFO;

function formatMessage(level: string, context: string | undefined, message: string, ...args: unknown[]): string {
  const prefix = context ? `[${level}] [${context}]` : `[${level}]`;
  const rest = args.length ? " " + args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ") : "";
  return `${prefix} ${message}${rest}`;
}

export const logger = {
  debug(context: string | undefined, message: string, ...args: unknown[]): void {
    if (currentLevel <= LEVELS.DEBUG) {
      console.debug(formatMessage("DEBUG", context, message, ...args));
    }
  },
  info(context: string | undefined, message: string, ...args: unknown[]): void {
    if (currentLevel <= LEVELS.INFO) {
      console.log(formatMessage("INFO", context, message, ...args));
    }
  },
  warn(context: string | undefined, message: string, ...args: unknown[]): void {
    if (currentLevel <= LEVELS.WARN) {
      console.warn(formatMessage("WARN", context, message, ...args));
    }
  },
  error(context: string | undefined, message: string, ...args: unknown[]): void {
    if (currentLevel <= LEVELS.ERROR) {
      console.error(formatMessage("ERROR", context, message, ...args));
    }
  },
};
