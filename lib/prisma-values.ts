import { Prisma } from "@prisma/client";

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
