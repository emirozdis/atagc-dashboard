import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization"; 
import { logAction } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeHtml } from "@/lib/sanitize";

const readLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });
const writeLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 100 });

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  try {
    await readLimiter.check(60, ip);
  } catch {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  // Require approved status to see internal announcements
  // Public logic handles non-logged in if allowed, but strict mode implies restriction.
  // We'll enforce requireApproved = true for authenticated applicants.
  const auth = await getAuthorization({ requireAuth: false, requireApproved: true });
  const session = auth.session;

  // However, getAuthorization might return 403 if requireApproved is true and user is pending.
  // But wait, getAuthorization returns {ok: false} if check fails.
  // We need to handle this manually because we allow unauthenticated access for PUBLIC announcements (if any)
  // OR we enforce approval only if logged in.
  
  // Actually, if a user is 'pending', they shouldn't see announcements page at all per requirement.
  // So if logged in AND pending, return 403.
  if (session?.user?.role === 'applicant' && session.user.applicationStatus !== 'approved') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Base query
  let query = supabase
    .from("announcements")
    .select(`
        *,
        author:users!announcements_author_id_fkey(full_name)
    `)
    .order("created_at", { ascending: false });

  if (!session?.user) {
     // If not logged in, only see public
     query = query.eq("is_public", true);
  } else {
     const role = session.user.role;
     const userId = session.user.id;

     if (role !== 'superadmin' && role !== 'admin') {
         // User logic: public + targeted
         const { data: memberData } = await supabase
             .from("committee_members")
             .select("committee_id")
             .eq("user_id", userId);
         
         const userCommitteeIds = memberData?.map(m => m.committee_id) || [];
         
         // Using Postgres array operators for overlap
         let orFilter = `is_public.eq.true,target_user_ids.cs.{${userId}}`;
         
         if (userCommitteeIds.length > 0) {
             const idsList = userCommitteeIds.map(id => id).join(',');
             orFilter += `,committee_ids.ov.{${idsList}}`;
         }
         
         query = query.or(orFilter);
     }
  }

  const { data, error } = await query;

  if (error) {
      console.error("Announcement fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  if (data && data.length > 0) {
      const allCommIds = new Set<string>();
      data.forEach((a: any) => {
          if (a.committee_ids) a.committee_ids.forEach((id: string) => allCommIds.add(id));
      });

      if (allCommIds.size > 0) {
          const { data: comms } = await supabase
              .from("committees")
              .select("id, name")
              .in("id", Array.from(allCommIds));
          
          const commMap = new Map(comms?.map(c => [c.id, c.name]));

          data.forEach((a: any) => {
              if (a.committee_ids) {
                  a.committees_list = a.committee_ids.map((id: string) => ({ name: commMap.get(id) || "Bilinmiyor" }));
              }
          });
      }
  }
  
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  try {
    await writeLimiter.check(10, ip);
  } catch {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok || !auth.session) {
    return NextResponse.json({ error: auth.message || "Unauthorized" }, { status: auth.status || 401 });
  }
  const session = auth.session;

  try {
    const body = await request.json();
    const { title, content, targetType, committeeIds, userIds } = body;

    const insertData: any = {
        title,
        content: sanitizeHtml(content),
        author_id: session.user.id,
        is_public: true, 
        committee_ids: null,
        target_user_ids: null,
        created_at: new Date().toISOString() // Explicit timestamptz
    };

    if (targetType === 'committee' && committeeIds && committeeIds.length > 0) {
        insertData.is_public = false;
        insertData.committee_ids = committeeIds;
    } else if (targetType === 'user' && userIds && userIds.length > 0) {
        insertData.is_public = false;
        insertData.target_user_ids = userIds; 
    }

    const { data: newAnnouncement, error } = await supabase
        .from("announcements")
        .insert(insertData)
        .select("id")
        .single();

    if (error) throw error;

    await logAction(session.user.id, "create_announcement", { 
        announcement_id: newAnnouncement.id,
        title: title,
        target: targetType,
        previous_state: null
    }, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Create announcement error:", error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    try {
        await writeLimiter.check(20, ip);
    } catch {
        return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
    }

    const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
    if (!auth.ok || !auth.session) return NextResponse.json({ error: auth.message || "Unauthorized" }, { status: auth.status || 401 });
    const session = auth.session;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const { data: previousState } = await supabase
            .from("announcements")
            .select("*")
            .eq("id", id)
            .single();

        const { error } = await supabase.from("announcements").delete().eq("id", id);

        if (error) throw error;

        await logAction(session.user.id, "delete_announcement", { 
            announcement_id: id,
            previous_state: previousState
        }, request);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}

// Change Log:
// - Added pending status check in GET: `if (session?.user?.role === 'applicant' && session.user.applicationStatus !== 'approved') return 403`.
// - Ensured `created_at` in POST uses `new Date().toISOString()`.
// - Sanitized content in POST.