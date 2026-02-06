import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

const readLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });
const writeLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 200 });

export const POST = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await writeLimiter.check(10, ip);

  const auth = await getAuthorization({ 
    requireAuth: true, 
    allowedRoles: [ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR, ROLES.SUPERADMIN] 
  });
  if (!auth.ok) throw new Error(auth.message);

  const { committeeId, title, options } = await request.json();

  const { data: vote, error: voteError } = await supabase
    .from("votes")
    .insert({ 
        committee_id: committeeId, 
        title, 
        status: 'open',
        created_at: new Date().toISOString() 
    })
    .select("id")
    .single();

  if (voteError) throw voteError;

  const optionsData = options.map((label: string) => ({
    vote_id: vote.id,
    label
  }));

  const { error: optionsError } = await supabase
    .from("vote_options")
    .insert(optionsData);

  if (optionsError) throw optionsError;

  return NextResponse.json({ success: true, voteId: vote.id });
});

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await readLimiter.check(60, ip);

  const auth = await getAuthorization({ requireAuth: true, requireApproved: true });
  if (!auth.ok || !auth.session) throw new Error(auth.message);
  const session = auth.session;

  const { searchParams } = new URL(request.url);
  const committeeId = searchParams.get("committeeId");

  if (!committeeId) throw new Error("Missing committee ID");

  if (session.user.role !== ROLES.SUPERADMIN && session.user.role !== ROLES.ADMIN) {
      let isAuthorized = false;

      if (session.user.role === ROLES.CHAIRMAN) {
          const { data: managed } = await supabase
              .from("committees")
              .select("id")
              .eq("id", committeeId)
              .eq("admin_id", session.user.id)
              .maybeSingle();
          if (managed) isAuthorized = true;
      }

      if (!isAuthorized) {
          const { data: membership } = await supabase
              .from("committee_members")
              .select("id")
              .eq("committee_id", committeeId)
              .eq("user_id", session.user.id)
              .maybeSingle();
          
          if (membership) isAuthorized = true;
      }

      if (!isAuthorized) {
          return NextResponse.json({ error: "Forbidden: You are not a member of this committee." }, { status: 403 });
      }
  }

  const { data, error } = await supabase
    .from("votes")
    .select(`
      id, title, status, created_at,
      options:vote_options(id, label),
      responses:vote_responses(option_id, user_id)
    `)
    .eq("committee_id", committeeId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return NextResponse.json(data);
});