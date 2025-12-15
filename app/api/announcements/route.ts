import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  // Base query
  // Note: Joining arrays in PostgREST is tricky. 
  // For simplicity in listing, we just fetch the arrays. 
  // The frontend can map IDs to names if it has the reference data, 
  // or we perform a second lookup.
  let query = supabase
    .from("announcements")
    .select(`
        *,
        author:users!announcements_author_id_fkey(full_name)
    `)
    .order("created_at", { ascending: false });

  // If no session, only show public
  if (!session?.user) {
     query = query.eq("is_public", true);
  } else {
     const role = session.user.role;
     const userId = session.user.id;

     // Admins see all announcements
     if (role !== 'superadmin' && role !== 'admin') {
         // Regular users see: 
         // 1. Public announcements
         // 2. Announcements where their committee ID is in the announcement's committee_ids array
         // 3. Announcements where their user ID is in the target_user_ids array
         
         // Fetch user's committee assignments
         const { data: memberData } = await supabase
             .from("committee_members")
             .select("committee_id")
             .eq("user_id", userId);
         
         const userCommitteeIds = memberData?.map(m => m.committee_id) || [];
         
         // PostgREST Filter Logic:
         // is_public.eq.true 
         // OR target_user_ids.cs.{userId}  (Contains check)
         // OR committee_ids.ov.{id1,id2}   (Overlap check)
         
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
  
  // Optional: Fetch committee names for display if needed
  // This is a simple client-side friendly optimization
  if (data && data.length > 0) {
      // Gather all unique committee IDs
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

          // Attach names
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
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "superadmin" && session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, content, targetType, committeeIds, userIds } = body;

    const insertData: any = {
        title,
        content,
        author_id: session.user.id,
        is_public: true, 
        committee_ids: null,
        target_user_ids: null
    };

    if (targetType === 'committee' && committeeIds && committeeIds.length > 0) {
        insertData.is_public = false;
        insertData.committee_ids = committeeIds;
    } else if (targetType === 'user' && userIds && userIds.length > 0) {
        insertData.is_public = false;
        insertData.target_user_ids = userIds; 
    }

    const { error } = await supabase.from("announcements").insert(insertData);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Create announcement error:", error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}