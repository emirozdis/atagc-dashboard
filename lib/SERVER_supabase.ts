import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase SERVER environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Change Log:
// - Fixed typo in environment variable name: `SUPBASE_SECRET_SERVICE_ROLE_KEY` -> `SUPABASE_SECRET_SERVICE_ROLE_KEY`.
// - Fixed typo in error message: `SERVERenvironment` -> `SERVER environment`.