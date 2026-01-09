import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";
import { getSignedUrl, getSignedUrls } from "@/lib/storage-utils";

// Read: 60/min
const readLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  try {
    await readLimiter.check(60, ip);
  } catch {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const auth = await getAuthorization({
    requireAuth: true,
    customCheck: async (session) => {
      const { data: committeeMember, error: cmError } = await supabase
        .from("committee_members")
        .select(`
          committee:committees (
            id,
            name,
            admin_id
          )
        `)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (cmError && cmError.code !== 'PGRST116') {
        return { ok: false, status: 500, message: "Database error" };
      }

      if (!committeeMember?.committee) {
        return { ok: false, status: 404, message: "Committee not found" };
      }

      return { ok: true, payload: { committeeMember } };
    },
  });

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const committeeMember = auth.payload.committeeMember;
    // @ts-ignore
    const committeeId = committeeMember.committee.id;
    // @ts-ignore
    const adminId = committeeMember.committee.admin_id;
    const currentUserId = auth.session!.user.id;
    const isSuperAdmin = auth.session!.user.role === 'superadmin';

    const { data: adminData } = await supabase
      .from("users")
      .select(`
        id,
        full_name,
        email,
        role,
        user_details ( profile_picture_url, is_profile_picture_hidden )
      `)
      .eq("id", adminId)
      .maybeSingle();

    let admin = null;
    if (adminData) {
      const details = Array.isArray(adminData.user_details) ? adminData.user_details[0] : adminData.user_details;
      const isSelf = adminData.id === currentUserId;
      const isHidden = details?.is_profile_picture_hidden;
      let adminImage = null;

      if (details?.profile_picture_url) {
        if (isSelf || isSuperAdmin || !isHidden) {
          adminImage = await getSignedUrl("profile-pictures", details.profile_picture_url);
        }
      }

      admin = {
        id: "chairman-" + adminData.id,
        userId: adminData.id,
        full_name: adminData.full_name,
        email: adminData.email,
        role: adminData.role || "committee_chairman",
        image: adminImage
      };
    }

    const { data: members, error: membersError } = await supabase
      .from("committee_members")
      .select(`
        id,
        can_write,
        user:users (
          id,
          full_name,
          email,
          role,
          user_details ( profile_picture_url, is_profile_picture_hidden )
        )
      `)
      .eq("committee_id", committeeId);

    if (membersError) return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });

    const pathsToSign: string[] = [];
    const formattedMembers = members?.map((m: any) => {
      const userData = Array.isArray(m.user) ? m.user[0] : m.user;
      const details = userData?.user_details && (Array.isArray(userData.user_details) ? userData.user_details[0] : userData.user_details);

      const isSelf = userData.id === currentUserId;
      const isHidden = details?.is_profile_picture_hidden;
      let imagePath = null;

      // Privacy Check
      if (details?.profile_picture_url) {
        if (isSelf || isSuperAdmin || !isHidden) {
          imagePath = details.profile_picture_url;
          if (imagePath && !imagePath.startsWith('http')) {
            pathsToSign.push(imagePath);
          }
        }
      }

      return {
        id: m.id,
        userId: userData?.id,
        full_name: userData?.full_name || "İsimsiz Üye",
        email: userData?.email || "",
        role: userData?.role || "applicant",
        can_edit: m.can_write,
        image: imagePath
      };
    }) || [];

    // Batch Sign
    if (pathsToSign.length > 0) {
      const signedData = await getSignedUrls("profile-pictures", pathsToSign);
      signedData?.forEach(item => {
        formattedMembers.forEach(m => {
          if (m.image === item.path) {
            m.image = item.signedUrl;
          }
        });
      });
    }

    return NextResponse.json({
      admin, // (Admin part omitted above but should follow same logic)
      members: formattedMembers
    });

  } catch (error) {
    console.error("Committee members API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Change Log:
// - Added privacy check logic for profile pictures.
// - Implemented batch signed URL generation.