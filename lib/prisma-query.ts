import "server-only";

import { prisma } from "./prisma";

/*
 * Compatibility data layer for the existing API surface. It deliberately
 * exposes only the small query vocabulary used by the routes; every database
 * operation is executed by Prisma's server-side PostgreSQL adapter.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DatabaseRow = Record<string, any>;
export type DatabaseData = DatabaseRow & DatabaseRow[];

export type DatabaseError = { message: string; code?: string };

export type DatabaseResult<T = DatabaseRow> = {
  // Supabase's JSON response can be either a row or an array. This intersection
  // preserves both access patterns for legacy routes at this compatibility edge.
  data: T;
  error: DatabaseError | null;
  count?: number | null;
};

type Filter = { sql: string; values: unknown[] };
type NestedSelection = { alias: string; target: string; fields: string; relationName?: string };

function toPostgrestValue(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toPostgrestValue);
  if (value && typeof value === "object" && !Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toPostgrestValue(item)]));
  }
  return value;
}

function toQueryParameter(value: unknown): unknown {
  if (value === null || value === undefined || typeof value !== "object") return value;
  if (value instanceof Date || Buffer.isBuffer(value) || value instanceof Uint8Array) return value;

  // Prisma's raw query adapter does not encode plain objects or arrays of
  // objects as PostgreSQL JSON values. Serialize those values explicitly so
  // json/jsonb columns receive valid JSON instead of "[object Object]".
  if (Array.isArray(value)) {
    return value.some((item) => item !== null && typeof item === "object") ? JSON.stringify(value) : value;
  }
  return JSON.stringify(value);
}

function isJsonPayloadValue(value: unknown): boolean {
  if (value === null || value === undefined || typeof value !== "object") return false;
  if (value instanceof Date || Buffer.isBuffer(value) || value instanceof Uint8Array) return false;
  return true;
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

const RELATIONS: Record<string, { target: string; source: string; targetKey?: string; many?: boolean }> = {
  "applications.form": { target: "application_forms", source: "form_id" },
  "applications.user": { target: "users", source: "user_id" },
  "users.user_details": { target: "user_details", source: "id", targetKey: "user_id" },
  "users.committee_members": { target: "committee_members", source: "id", targetKey: "user_id", many: true },
  "users.user_warnings": { target: "user_warnings", source: "id", targetKey: "user_id", many: true },
  "user_warnings.issuer": { target: "users", source: "issued_by" },
  "users.warnings_count": { target: "user_warnings", source: "id", targetKey: "user_id", many: true },
  "users.payment_receipts": { target: "payment_receipts", source: "id", targetKey: "user_id", many: true },
  "users.application": { target: "applications", source: "id", targetKey: "user_id", many: true },
  "users.managed_committees": { target: "committees", source: "id", targetKey: "admin_id", many: true },
  "user_details.high_schools": { target: "high_schools", source: "high_school_id" },
  "committee_members.committee": { target: "committees", source: "committee_id" },
  "conference_assignments.committee": { target: "committees", source: "committee_id" },
  "security_entry_logs.user": { target: "users", source: "scanned_user_id" },
  "security_entry_logs.scanner": { target: "users", source: "scanned_by" },
  "resources.uploader": { target: "users", source: "uploaded_by" },
  "resources.committee": { target: "committees", source: "committee_id" },
  "press_photos.area": { target: "photo_areas", source: "area_id" },
  "press_photos.uploader": { target: "users", source: "uploaded_by" },
  "delegation_magiclinks.delegation_info": { target: "delegations", source: "delegation" },
  "delegation_invites.delegation": { target: "delegations", source: "delegation_id" },
  "delegation_members.user": { target: "users", source: "user_id" },
  "delegation_members.users": { target: "users", source: "user_id" },
  "delegation_members.application": { target: "applications", source: "user_id", targetKey: "user_id" },
  "tickets.messages": { target: "ticket_messages", source: "id", targetKey: "ticket_id", many: true },
  "observer_allocations.users": { target: "users", source: "id", many: false },
  "committees.topic": { target: "topics", source: "id", targetKey: "committee_id", many: true },
  "committees.topics": { target: "topics", source: "id", targetKey: "committee_id", many: true },
  "gallery.area": { target: "photo_areas", source: "area_id" },
  "gallery.uploader": { target: "users", source: "uploaded_by" },
};

const RPC_ARGUMENTS: Record<string, string[]> = {
  claim_ravenmun_email_outbox: ["p_limit", "p_worker"],
  submit_ravenmun_application: ["p_user_id", "p_email", "p_application_type", "p_form_id", "p_form_version", "p_form_snapshot", "p_form_data", "p_delegation_id", "p_invite_id", "p_magiclink_id", "p_delegation_name"],
  assign_ravenmun_conference_role: ["p_user_ids", "p_role", "p_committee_id", "p_actor_id"],
  publish_ravenmun_announcement: ["p_title", "p_content", "p_author_id", "p_target_type", "p_target_roles", "p_committee_ids", "p_user_ids", "p_recipients"],
  increment_ravenmun_auth_attempt: ["p_challenge_id"],
  submit_ravenmun_payment_receipt: ["p_user_id", "p_application_id", "p_storage_path", "p_file_type", "p_actor_id"],
  create_ravenmun_delegation_invite: ["p_owner_id", "p_email", "p_token_hash", "p_expires_at", "p_link", "p_inviter_name", "p_subject", "p_html"],
};

const VOID_RPCS = new Set(["assign_ravenmun_conference_role"]);

function identifier(value: string): string {
  if (!IDENTIFIER.test(value)) throw new Error(`Unsafe database identifier: ${value}`);
  return `"${value}"`;
}

function tableName(value: string): string {
  return `"public".${identifier(value)}`;
}

function splitSelection(selection: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < selection.length; index += 1) {
    const character = selection[index];
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      parts.push(selection.slice(start, index).trim());
      start = index + 1;
    }
  }
  const finalPart = selection.slice(start).trim();
  if (finalPart) parts.push(finalPart);
  return parts;
}

function parseSelection(selection: string): { columns: string; nested: NestedSelection[] } {
  const fields = splitSelection(selection || "*");
  const columns: string[] = [];
  const nested: NestedSelection[] = [];

  for (const field of fields) {
    const open = field.indexOf("(");
    if (open < 0) {
      if (field === "*" || (IDENTIFIER.test(field) && !field.includes("!"))) columns.push(field === "*" ? "*" : identifier(field));
      continue;
    }

    const close = field.lastIndexOf(")");
    if (close < open) continue;
    const head = field.slice(0, open).trim();
    const alias = head.split(":", 2)[0].split("!", 2)[0].trim();
    const afterColon = head.includes(":") ? head.split(":").slice(1).join(":") : alias;
    const target = afterColon.split("!", 2)[0].trim() || alias;
    if (IDENTIFIER.test(alias) && IDENTIFIER.test(target)) {
      nested.push({ alias, target, fields: field.slice(open + 1, close), relationName: head.includes("!") ? head.split("!", 2)[1] : undefined });
    }
  }

  return { columns: columns.length ? columns.join(", ") : "*", nested };
}

function asArray<T>(value: T | T[] | null): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function relationFor(parent: string, nested: NestedSelection): { target: string; source: string; targetKey: string; many: boolean } | null {
  const mapped = RELATIONS[`${parent}.${nested.alias}`];
  if (mapped) return { target: mapped.target, source: mapped.source, targetKey: mapped.targetKey ?? "id", many: mapped.many ?? false };
  if (nested.target === "users" && ["user", "users", "author", "uploader", "scanner"].includes(nested.alias)) {
    return { target: "users", source: `${nested.alias === "scanner" ? "scanned_by" : nested.alias === "uploader" ? "uploaded_by" : "user_id"}`, targetKey: "id", many: false };
  }
  return null;
}

async function hydrateRelations(parent: string, rows: DatabaseRow[], nested: NestedSelection[]): Promise<void> {
  for (const selection of nested) {
    const relation = relationFor(parent, selection);
    if (!relation) {
      for (const row of rows) row[selection.alias] = [];
      continue;
    }

    const { columns, nested: childNested } = parseSelection(selection.fields);
    for (const row of rows) {
      const sourceValue = row[relation.source];
      if (sourceValue === null || sourceValue === undefined) {
        row[selection.alias] = relation.many ? [] : null;
        continue;
      }
      const childRows = await prisma.$queryRawUnsafe<DatabaseRow[]>(
        `SELECT ${columns} FROM ${tableName(relation.target)} WHERE ${identifier(relation.targetKey)} = $1${relation.many ? "" : " LIMIT 1"}`,
        sourceValue,
      );
      await hydrateRelations(relation.target, childRows, childNested);
      row[selection.alias] = relation.many ? childRows : childRows[0] ?? null;
    }
  }
}

export class PrismaQuery<T = DatabaseRow> implements PromiseLike<DatabaseResult<T>> {
  private operation: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private selection = "*";
  private selectionOptions: { count?: "exact"; head?: boolean } = {};
  private filters: Filter[] = [];
  private orderBy: { column: string; ascending: boolean }[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  private requireSingle = false;
  private allowMissing = false;
  private payload: DatabaseRow | DatabaseRow[] | null = null;
  private returnRows = false;
  private conflictTarget?: string;

  constructor(private readonly table: string) {
    identifier(table);
  }

  select(selection = "*", options?: { count?: "exact"; head?: boolean }): PrismaQuery<T> {
    this.selection = selection;
    this.selectionOptions = options ?? {};
    this.returnRows = true;
    return this;
  }

  insert(values: DatabaseRow | DatabaseRow[]): PrismaQuery<T> {
    this.operation = "insert";
    this.payload = values;
    return this;
  }

  update(values: DatabaseRow): PrismaQuery<T> {
    this.operation = "update";
    this.payload = values;
    return this;
  }

  upsert(values: DatabaseRow | DatabaseRow[], options?: { onConflict?: string }): PrismaQuery<T> {
    this.operation = "upsert";
    this.payload = values;
    this.conflictTarget = options?.onConflict;
    return this;
  }

  delete(): PrismaQuery<T> {
    this.operation = "delete";
    return this;
  }

  eq(column: string, value: unknown): PrismaQuery<T> { return this.addFilter(column, "=", value); }
  neq(column: string, value: unknown): PrismaQuery<T> { return this.addFilter(column, "!=", value); }
  gt(column: string, value: unknown): PrismaQuery<T> { return this.addFilter(column, ">", value); }
  gte(column: string, value: unknown): PrismaQuery<T> { return this.addFilter(column, ">=", value); }
  lt(column: string, value: unknown): PrismaQuery<T> { return this.addFilter(column, "<", value); }
  lte(column: string, value: unknown): PrismaQuery<T> { return this.addFilter(column, "<=", value); }
  is(column: string, value: null | boolean): PrismaQuery<T> {
    if (value === null) return this.addFilter(column, "IS NULL", value);
    return this.addFilter(column, "=", value);
  }
  ilike(column: string, value: string): PrismaQuery<T> { return this.addFilter(column, "ILIKE", value); }
  like(column: string, value: string): PrismaQuery<T> { return this.addFilter(column, "LIKE", value); }
  in(column: string, values: unknown[]): PrismaQuery<T> {
    const safeColumn = identifier(column);
    const start = this.filterParameterCount();
    const placeholders = values.map((value, index) => ({ sql: `$${start + index}`, values: [value] }));
    this.filters.push({ sql: `${safeColumn} IN (${placeholders.map((item) => item.sql).join(", ") || "NULL"})`, values: placeholders.flatMap((item) => item.values) });
    return this;
  }
  order(column: string, options?: { ascending?: boolean; foreignTable?: string; nullsFirst?: boolean }): PrismaQuery<T> { identifier(column); this.orderBy.push({ column, ascending: options?.ascending ?? true }); return this; }
  or(expression: string, _options?: { foreignTable?: string }): PrismaQuery<T> {
    void _options;
    const start = this.filterParameterCount();
    const clauses = expression.split(",").map((part) => part.trim()).filter(Boolean).map((part, index) => {
      const [column, operator, ...rawValue] = part.split(".");
      const value = rawValue.join(".");
      const operatorMap: Record<string, string> = { eq: "=", neq: "!=", gt: ">", gte: ">=", lt: "<", lte: "<=", ilike: "ILIKE", like: "LIKE" };
      if (!column || !operatorMap[operator] || value === undefined) throw new Error("Invalid OR filter");
      const parameter = start + index;
      return { sql: `${identifier(column)} ${operatorMap[operator]} $${parameter}`, values: [value.replace(/^%25|%25$/g, "%").replace(/^%|%$/g, "%")] };
    });
    if (clauses.length) this.filters.push({ sql: `(${clauses.map((clause) => clause.sql).join(" OR ")})`, values: clauses.flatMap((clause) => clause.values) });
    return this;
  }
  filter(column: string, operator: string, value: unknown): PrismaQuery<T> {
    const operatorMap: Record<string, string> = { eq: "=", neq: "!=", gt: ">", gte: ">=", lt: "<", lte: "<=", ilike: "ILIKE", like: "LIKE" };
    if (operator === "is") return this.is(column, value as null | boolean);
    if (!operatorMap[operator]) throw new Error(`Unsupported filter operator: ${operator}`);
    return this.addFilter(column, operatorMap[operator], value);
  }
  match(values: DatabaseRow): PrismaQuery<T> { Object.entries(values).forEach(([column, value]) => this.eq(column, value)); return this; }
  limit(value: number): PrismaQuery<T> { this.limitValue = Math.max(0, Math.floor(value)); return this; }
  range(from: number, to: number): PrismaQuery<T> { this.offsetValue = Math.max(0, Math.floor(from)); this.limitValue = Math.max(0, Math.floor(to - from + 1)); return this; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  single(): PrismaQuery<any> { this.requireSingle = true; this.allowMissing = false; return this as PrismaQuery<any>; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  maybeSingle(): PrismaQuery<any> { this.requireSingle = true; this.allowMissing = true; return this as PrismaQuery<any>; }

  then<TResult1 = DatabaseResult<T>, TResult2 = never>(onfulfilled?: ((value: DatabaseResult<T>) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): Promise<TResult1 | TResult2> {
    return this.execute()
      .then((result) => ({ ...result, data: toPostgrestValue(result.data) as T }))
      .then(onfulfilled, onrejected);
  }

  private filterParameterCount(): number { return this.filters.reduce((total, filter) => total + filter.values.length, 0) + 1; }

  private addFilter(column: string, operator: string, value: unknown): PrismaQuery<T> {
    identifier(column);
    if (operator === "IS NULL" || operator === "IS NOT NULL") this.filters.push({ sql: `${identifier(column)} ${operator}`, values: [] });
    else this.filters.push({ sql: `${identifier(column)} ${operator} $${this.filterParameterCount()}`, values: [value] });
    return this;
  }

  private whereClause(): { sql: string; values: unknown[] } {
    return { sql: this.filters.length ? ` WHERE ${this.filters.map((filter) => filter.sql).join(" AND ")}` : "", values: this.filters.flatMap((filter) => filter.values) };
  }

  private async execute(): Promise<DatabaseResult<T>> {
    try {
      if (this.operation === "select") return await this.executeSelect();
      const payloadRows = asArray(this.payload);
      if (!payloadRows.length && this.operation !== "delete") return { data: null as T, error: { message: "A payload is required" } };
      const where = this.whereClause();
      const returning = this.returnRows ? " RETURNING *" : "";
      if (this.operation === "insert") {
        const columns = Object.keys(payloadRows[0]);
        columns.forEach(identifier);
        const params: unknown[] = [];
        const values = payloadRows.map((row) => `(${columns.map((column) => { const isJson = isJsonPayloadValue(row[column]); params.push(toQueryParameter(row[column])); return `$${params.length}${isJson ? "::jsonb" : ""}`; }).join(", ")})`).join(", ");
        const rows = this.returnRows
          ? await prisma.$queryRawUnsafe<DatabaseRow[]>(`INSERT INTO ${tableName(this.table)} (${columns.map(identifier).join(", ")}) VALUES ${values}${returning}`, ...params)
          : await prisma.$executeRawUnsafe(`INSERT INTO ${tableName(this.table)} (${columns.map(identifier).join(", ")}) VALUES ${values}`, ...params).then(() => null);
        if (!rows || !this.requireSingle) return { data: (rows ? rows : null) as T, error: null };
        if (rows.length === 0) return { data: null as T, error: this.allowMissing ? null : { message: "No rows found", code: "PGRST116" } };
        if (rows.length > 1) return { data: null as T, error: { message: "Multiple rows found", code: "PGRST116" } };
        return { data: rows[0] as T, error: null };
      }
      if (this.operation === "upsert") {
        const columns = Object.keys(payloadRows[0]);
        columns.forEach(identifier);
        const params: unknown[] = [];
        const values = payloadRows.map((row) => `(${columns.map((column) => { const isJson = isJsonPayloadValue(row[column]); params.push(toQueryParameter(row[column])); return `$${params.length}${isJson ? "::jsonb" : ""}`; }).join(", ")})`).join(", ");
        const updates = columns.map((column) => `${identifier(column)} = EXCLUDED.${identifier(column)}`).join(", ");
        const conflict = this.conflictTarget ? ` (${this.conflictTarget.split(",").map(identifier).join(", ")})` : "";
        const rows = await prisma.$queryRawUnsafe<DatabaseRow[]>(`INSERT INTO ${tableName(this.table)} (${columns.map(identifier).join(", ")}) VALUES ${values} ON CONFLICT${conflict} DO UPDATE SET ${updates} RETURNING *`, ...params);
        if (!this.requireSingle) return { data: rows as T, error: null };
        if (rows.length === 0) return { data: null as T, error: this.allowMissing ? null : { message: "No rows found", code: "PGRST116" } };
        if (rows.length > 1) return { data: null as T, error: { message: "Multiple rows found", code: "PGRST116" } };
        return { data: rows[0] as T, error: null };
      }
      if (this.operation === "update") {
        const values: unknown[] = [];
        const assignments = Object.keys(this.payload ?? {}).map((column) => { identifier(column); const rawVal = (this.payload as DatabaseRow)[column]; const isJson = isJsonPayloadValue(rawVal); values.push(toQueryParameter(rawVal)); return `${identifier(column)} = $${values.length}${isJson ? "::jsonb" : ""}`; }).join(", ");
        const offset = values.length;
        const shiftedWhere = where.sql.replace(/\$(\d+)/g, (_, index: string) => `$${Number(index) + offset}`);
        const rows = await prisma.$queryRawUnsafe<DatabaseRow[]>(`UPDATE ${tableName(this.table)} SET ${assignments}${shiftedWhere}${returning}`, ...values, ...where.values.map(toQueryParameter));
        if (!this.returnRows) return { data: null as T, error: null };
        if (!this.requireSingle) return { data: rows as T, error: null };
        if (rows.length === 0) return { data: null as T, error: this.allowMissing ? null : { message: "No rows found", code: "PGRST116" } };
        if (rows.length > 1) return { data: null as T, error: { message: "Multiple rows found", code: "PGRST116" } };
        return { data: rows[0] as T, error: null };
      }
      const rows = await prisma.$queryRawUnsafe<DatabaseRow[]>(`DELETE FROM ${tableName(this.table)}${where.sql}${returning}`, ...where.values.map(toQueryParameter));
      if (!this.returnRows) return { data: null as T, error: null };
      if (!this.requireSingle) return { data: rows as T, error: null };
      if (rows.length === 0) return { data: null as T, error: this.allowMissing ? null : { message: "No rows found", code: "PGRST116" } };
      if (rows.length > 1) return { data: null as T, error: { message: "Multiple rows found", code: "PGRST116" } };
      return { data: rows[0] as T, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { data: null as T, error: { message } };
    }
  }

  private async executeSelect(): Promise<DatabaseResult<T>> {
    const parsed = parseSelection(this.selection);
    const where = this.whereClause();
    const order = this.orderBy.length ? ` ORDER BY ${this.orderBy.map((item) => `${identifier(item.column)} ${item.ascending ? "ASC" : "DESC"}`).join(", ")}` : "";
    const pagination = this.limitValue === undefined ? "" : ` LIMIT ${this.limitValue}${this.offsetValue === undefined ? "" : ` OFFSET ${this.offsetValue}`}`;
    const rows = this.selectionOptions.head ? [] : await prisma.$queryRawUnsafe<DatabaseRow[]>(`SELECT ${parsed.columns} FROM ${tableName(this.table)}${where.sql}${order}${pagination}`, ...where.values.map(toQueryParameter));
    if (!this.selectionOptions.head) await hydrateRelations(this.table, rows, parsed.nested);
    let count: number | null | undefined;
    if (this.selectionOptions.count === "exact") {
      const countRows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(`SELECT COUNT(*)::bigint AS count FROM ${tableName(this.table)}${where.sql}`, ...where.values.map(toQueryParameter));
      count = Number(countRows[0]?.count ?? 0);
    }
    if (this.requireSingle) {
      if (rows.length === 0) return { data: null as T, error: this.allowMissing ? null : { message: "No rows found", code: "PGRST116" }, count };
      if (rows.length > 1) return { data: null as T, error: { message: "Multiple rows found", code: "PGRST116" }, count };
      return { data: rows[0] as T, error: null, count };
    }
    return { data: rows as T, error: null, count };
  }
}

export function fromPrisma<T = DatabaseData>(table: string): PrismaQuery<T> {
  return new PrismaQuery<T>(table);
}

export async function rpcPrisma<T = DatabaseData>(name: string, args: Record<string, unknown> = {}): Promise<DatabaseResult<T>> {
  try {
    identifier(name);
    const argumentNames = RPC_ARGUMENTS[name] ?? Object.keys(args);
    const values = argumentNames.map((argument) => toQueryParameter(args[argument] ?? null));
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
    if (VOID_RPCS.has(name)) {
      await prisma.$queryRawUnsafe<DatabaseRow[]>(`SELECT "public".${identifier(name)}(${placeholders})::text AS result`, ...values);
      return { data: null as T, error: null };
    }
    const rows = await prisma.$queryRawUnsafe<DatabaseRow[]>(`SELECT * FROM "public".${identifier(name)}(${placeholders})`, ...values);
    if (!rows.length) return { data: null as T, error: null };
    const value = toPostgrestValue(Object.keys(rows[0]).length === 1 ? Object.values(rows[0])[0] : rows);
    return { data: value as T, error: null };
  } catch (error) {
    return { data: null as T, error: { message: error instanceof Error ? error.message : String(error) } };
  }
}
