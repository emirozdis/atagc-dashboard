import { Prisma } from "@prisma/client";

/**
 * Serialize a value destined for a json/jsonb raw-query parameter.
 *
 * node-postgres encodes JavaScript arrays as PostgreSQL array literals
 * (`{"a","b"}`), which jsonb columns reject. Every array therefore has to be
 * rendered as JSON text, including arrays that contain only primitives.
 */
export function toJsonQueryParameter(value: unknown): string {
  return JSON.stringify(value) ?? "null";
}

/**
 * Convert Prisma raw query values to the JSON-compatible values exposed by
 * the old Supabase-shaped data layer.
 */
export function toPostgrestValue(value: unknown): unknown {
  if (value instanceof Prisma.Decimal) {
    const numericValue = Number(value.toString());
    return Number.isFinite(numericValue) ? numericValue : value.toString();
  }
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toPostgrestValue);
  if (value && typeof value === "object" && !Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toPostgrestValue(item)]));
  }
  return value;
}
