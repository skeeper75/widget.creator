/**
 * Deep camelCase <-> snake_case key transformer for API responses.
 * Database columns use snake_case; TypeScript uses camelCase.
 */

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function transformKeys(obj: unknown, transformer: (key: string) => string): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((item) => transformKeys(item, transformer));
  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[transformer(key)] = transformKeys(value, transformer);
    }
    return result;
  }
  return obj;
}

/**
 * Convert camelCase object keys to snake_case (deep).
 * Used for API response serialization.
 */
export function toSnakeCase<T>(obj: T): T {
  return transformKeys(obj, camelToSnake) as T;
}

/**
 * Convert snake_case object keys to camelCase (deep).
 * Used for parsing external input into internal representations.
 */
export function toCamelCase<T>(obj: T): T {
  return transformKeys(obj, snakeToCamel) as T;
}
