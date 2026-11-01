// Applies supabase/migrations/0022_ravenmun_sync_application_fees.sql to the
// live RavenMUN database.
//
// Usage (from the repository root):
//   node --experimental-strip-types scripts/apply-migration-0022.ts --dry-run
//   node --experimental-strip-types scripts/apply-migration-0022.ts --apply

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { Client } from "pg";

const root = process.cwd();
const migrationPath = path.join(root, "supabase", "migrations", "0022_ravenmun_sync_application_fees.sql");

function readDirectUrl(): string {
  const env = readFileSync(path.join(root, ".env"), "utf8");
  const match = env.match(/^DIRECT_URL\s*=\s*"?([^"\r\n]+)"?\s*$/m);
  if (!match) throw new Error("DIRECT_URL is missing from .env");
  return match[1].trim();
}

async function main() {
  if (!existsSync(migrationPath)) throw new Error(`Run this from the repository root. ${migrationPath} was not found.`);

  const apply = process.argv.includes("--apply");
  const sql = readFileSync(migrationPath, "utf8");
  const client = new Client({ connectionString: readDirectUrl(), ssl: { rejectUnauthorized: false } });

  await client.connect();
  try {
    await client.query("begin");
    const before = await client.query(`
      select count(*)::int as n
      from public.applications a
      join public.application_forms f on f.id = a.form_id
      where a.form_snapshot is null
         or a.form_snapshot ->> 'fee' is null
         or (a.form_snapshot ->> 'fee')::numeric <> f.fee
    `);
    await client.query(sql);
    const after = await client.query(`
      select count(*)::int as n
      from public.applications a
      join public.application_forms f on f.id = a.form_id
      where (a.form_snapshot ->> 'fee')::numeric <> f.fee
    `);
    if (apply) {
      await client.query("commit");
      console.log(`migration 0022 applied and committed (mismatched before: ${before.rows[0].n}, after: ${after.rows[0].n})`);
    } else {
      await client.query("rollback");
      console.log(`migration 0022 parsed and executed successfully, then rolled back (mismatched before: ${before.rows[0].n}, inside transaction after: ${after.rows[0].n})`);
    }
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    console.error("migration 0022 FAILED:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
