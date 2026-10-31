// Applies supabase/migrations/0021_ravenmun_payment_after_acceptance.sql to the
// live RavenMUN database.
//
// Usage (from the repository root):
//   node --experimental-strip-types scripts/apply-migration-0021.ts --dry-run
//   node --experimental-strip-types scripts/apply-migration-0021.ts --apply
//
// --dry-run executes the whole migration inside a transaction and then rolls
// back, so the SQL is fully parsed and the affected row count is verified
// against the real schema without changing anything.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { Client } from "pg";

const root = process.cwd();
const migrationPath = path.join(root, "supabase", "migrations", "0021_ravenmun_payment_after_acceptance.sql");

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
    const before = await client.query("select count(*)::int as n from public.applications where payment_status = 'exempt' and status in ('accepted', 'approved')");
    await client.query(sql);
    const after = await client.query("select count(*)::int as n from public.applications where payment_status = 'unpaid' and status in ('accepted', 'approved')");
    if (apply) {
      await client.query("commit");
      console.log(`migration 0021 applied and committed (exempt before: ${before.rows[0].n}, unpaid after: ${after.rows[0].n})`);
    } else {
      await client.query("rollback");
      console.log(`migration 0021 parsed and executed successfully, then rolled back (exempt before: ${before.rows[0].n}, unpaid inside transaction: ${after.rows[0].n})`);
    }
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    console.error("migration 0021 FAILED:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
