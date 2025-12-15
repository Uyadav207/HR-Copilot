/**
 * Transform camelCase object keys to snake_case
 * This is needed to maintain compatibility with the frontend which expects snake_case
 */
function toSnakeCase(str: string): string {
  // Special cases for specific field mappings
  if (str === "actionMetadata") {
    return "metadata";
  }
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);
}

function transformValue(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  // Convert enum values from uppercase (DB) to lowercase (frontend)
  if (typeof value === "string") {
    const enumValues: Record<string, string> = {
      // Candidate status
      PENDING: "pending",
      EVALUATED: "evaluated",
      INVITED: "invited",
      REJECTED: "rejected",
      ON_HOLD: "on_hold",
      // Evaluation decision
      YES: "yes",
      MAYBE: "maybe",
      NO: "no",
      // Email type
      INVITE: "invite",
      REJECT: "reject",
      HOLD: "hold",
    };
    if (enumValues[value]) {
      return enumValues[value];
    }
  }

  if (Array.isArray(value)) {
    return value.map(transformValue);
  }

  if (isObject(value)) {
    const transformed: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      transformed[toSnakeCase(key)] = transformValue(val);
    }
    return transformed;
  }

  return value;
}

/**
 * Transform an object or array from camelCase to snake_case for API responses
 */
export function toSnakeCaseResponse<T>(data: T): any {
  return transformValue(data);
}
