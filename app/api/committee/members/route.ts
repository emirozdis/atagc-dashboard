import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";
import { getSignedUrl, getSignedUrls } from "@/lib/storage-utils";
import { logAction } from "@/lib/logger";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  try {
    await limiter.check(60, ip);
  } catch {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const auth = await getAuthorization({
    requireAuth: true,
    customCheck: async (session) => {
      // 1. Try to find if user is a member of a committee
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

      // 2. If not a member, check if user is a Chairman (admin of a committee)
      if (!committeeMember) {
        const { data: managedCommittee } = await supabase
          .from("committees")
          .select("id, name, admin_id")
          .eq("admin_id", session.user.id)
          .maybeSingle();

        if (managedCommittee) {
          // Construct a mock member object for the chairman context
          return { 
            ok: true, 
            payload: { 
              committeeMember: { committee: managedCommittee } 
            } 
          };
        }
      }

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

    // Fetch Admin Details
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

    // Fetch Members
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
      admin, 
      members: formattedMembers
    });

  } catch (error) {
    console.error("Committee members API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  try {
    await limiter.check(20, ip);
  } catch {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  // Only Chairmen, Superadmins, Admins can modify permissions
  const auth = await getAuthorization({ 
    requireAuth: true, 
    allowedRoles: ["superadmin", "admin", "committee_chairman"] 
  });

  if (!auth.ok || !auth.session) {
    return NextResponse.json({ error: auth.message || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const { memberId, canEdit } = await request.json();

    if (!memberId || typeof canEdit !== "boolean") {
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }

    // 1. Verify Member Exists & Get Context
    const { data: memberRecord, error: fetchError } = await supabase
      .from("committee_members")
      .select("id, committee_id, user_id")
      .eq("id", memberId)
      .single();

    if (fetchError || !memberRecord) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // 2. Authorization Check (Ownership)
    // If not superadmin/admin, verify the user is the chairman of THIS committee
    if (auth.session.user.role !== 'superadmin' && auth.session.user.role !== 'admin') {
      const { data: committee } = await supabase
        .from("committees")
        .select("admin_id")
        .eq("id", memberRecord.committee_id)
        .single();

      if (committee?.admin_id !== auth.session.user.id) {
        return NextResponse.json({ error: "Forbidden: You do not manage this committee" }, { status: 403 });
      }
    }

    // 3. Update Permission
    const { error: updateError } = await supabase
      .from("committee_members")
      .update({ can_write: canEdit })
      .eq("id", memberId);

    if (updateError) throw updateError;

    // 4. Log Action
    await logAction(auth.session.user.id, "update_member_permission", {
      target_member_id: memberRecord.id,
      target_user_id: memberRecord.user_id,
      can_write: canEdit
    }, request);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Update permission error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}