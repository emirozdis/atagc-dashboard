// Applies supabase/migrations/0019_ravenmun_multiple_delegations.sql to the
// live RavenMUN database.
//
// Usage (from the repository root):
//   node --experimental-strip-types scripts/apply-migration-0019.ts --dry-run
//   node --experimental-strip-types scripts/apply-migration-0019.ts --apply
//
// --dry-run executes the whole migration inside a transaction and then rolls
// back, so the SQL is fully parsed and the constraint/index names are verified
// against the real schema without changing anything.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { Client } from "pg";

const root = process.cwd();
const migrationPath = path.join(root, "supabase", "migrations", "0019_ravenmun_multiple_delegations.sql");

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
    await client.query(sql);
    if (apply) {
      await client.query("commit");
      console.log("migration 0019 applied and committed");
    } else {
      await client.query("rollback");
      console.log("migration 0019 parsed and executed successfully, then rolled back");
    }
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    console.error("migration 0019 FAILED:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();