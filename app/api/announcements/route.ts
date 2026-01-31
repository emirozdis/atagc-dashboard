import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization"; 
import { Logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeHtml } from "@/lib/sanitize";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

const readLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });
const writeLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 100 });

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await readLimiter.check(60, ip);

  const auth = await getAuthorization({ requireAuth: false, requireApproved: true });
  const session = auth.session;

  if (!session?.user) {
    const { data: publicAnnouncements, error: publicError } = await supabase
      .from("announcements")
      .select(`
          *,
          author:users!announcements_author_id_fkey(full_name)
      `)
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (publicError) throw publicError;
    return NextResponse.json(publicAnnouncements);
  }

  const { data, error } = await supabase.rpc('get_user_announcements', { p_user_id: session.user.id });
  
  if (error) {
    console.error("Error calling get_user_announcements RPC:", error);
    throw new Error("Failed to fetch announcements.");
  }


  const formattedData = data.map((item: any) => ({
      ...item,
      author: { full_name: item.author_name },
      committees_list: item.committees_list || []
  }));
  
  return NextResponse.json(formattedData);
});

export const POST = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await writeLimiter.check(10, ip);

  const auth = await getAuthorization({ 
    requireAuth: true, 
    allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] 
  });
  if (!auth.ok || !auth.session) throw new Error(auth.message);
  const session = auth.session;

  const body = await request.json();
  const { title, content, targetType, committeeIds, userIds } = body;

  const insertData: any = {
      title,
      content: sanitizeHtml(content),
      author_id: session.user.id,
      is_public: false,
      committee_ids: null,
      target_user_ids: null,
      created_at: new Date().toISOString()
  };

  if (targetType === 'all') {
    insertData.is_public = true;
  } else if (targetType === 'committee' && committeeIds && committeeIds.length > 0) {
      insertData.committee_ids = committeeIds;
  } else if (targetType === 'user' && userIds && userIds.length > 0) {
      insertData.target_user_ids = userIds; 
  }

  const { data: newAnnouncement, error } = await supabase
      .from("announcements")
      .insert(insertData)
      .select("id")
      .single();

  if (error) throw error;

  await Logger.audit(
      { userId: session.user.id, req: request },
      { 
          action: "create_announcement", 
          category: "business",
          resourceType: "announcement",
          resourceId: newAnnouncement.id,
          metadata: { title, target: targetType }
      }
  );

  return NextResponse.json({ success: true });
});

export const DELETE = apiHandler(async (request: Request) => {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    await writeLimiter.check(20, ip);

    const auth = await getAuthorization({ 
        requireAuth: true, 
        allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] 
    });
    if (!auth.ok || !auth.session) throw new Error(auth.message);
    const session = auth.session;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) throw new Error("Missing ID");

    const { data: previousState } = await supabase
        .from("announcements")
        .select("*")
        .eq("id", id)
        .single();

    const { error } = await supabase.from("announcements").delete().eq("id", id);

    if (error) throw error;

    await Logger.audit(
        { userId: session.user.id, req: request },
        { 
            action: "delete_announcement", 
            category: "business",
            resourceType: "announcement",
            resourceId: id,
            metadata: { deleted_title: previousState?.title }
        }
    );

    return NextResponse.json({ success: true });
});