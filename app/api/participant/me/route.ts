import { NextResponse } from "next/server";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { rateLimit } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/api-handler";
import { getSignedUrl } from "@/lib/storage-utils";
import { updateProfileSchema } from "@/lib/schemas";
import { ROLES } from "@/lib/roles";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(60, ip);

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error(auth.message || 'Unauthorized');
  
  const session = auth.session;
  const userId = session.user.id;

  const { data, error } = await supabase.rpc("get_participant_me_data", { 
    target_user_id: userId 
  });

  if (error) {
    console.error("RPC Error:", error);
    throw new Error("Veritabanı hatası");
  }

  if (!data || !data.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { user, userDetails, committeeMember } = data;

  if (userDetails?.profile_picture_url) {
    const signed = await getSignedUrl("profile-pictures", userDetails.profile_picture_url);
    if (signed) userDetails.profile_picture_url = signed;
  }

  if (committeeMember?.committee?.admin) {
    const adminUser = committeeMember.committee.admin;
    const adminDetails = adminUser.user_details;
    const isAdminSelf = adminUser.id === userId;

    const isHidden = adminDetails?.is_profile_picture_hidden;
    const canView = isAdminSelf || user.role === ROLES.SUPERADMIN || !isHidden;

    if (adminDetails?.profile_picture_url && canView) {
      const signedAdmin = await getSignedUrl("profile-pictures", adminDetails.profile_picture_url);
      adminUser.profile_picture_url = signedAdmin;
    } else {
      adminUser.profile_picture_url = null;
    }
  }

  const settings = data.settings || {};
  const finalSettings = {
    term_name: settings.term_name ?? "ATAGÇ",
    location: settings.location ?? "Konum Belirlenmedi",
    event_start_date: settings.event_start_date ?? null,
    event_end_date: settings.event_end_date ?? null,
    contact_email: settings.contact_email ?? "info@atagc.com.tr"
  };

  return NextResponse.json({
    ...data,
    settings: finalSettings
  });
});

export const PUT = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(10, ip);

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const session = auth.session;

  const body = await request.json();
  const validData = updateProfileSchema.parse(body);

  if (validData.full_name) {
    const { error: userError } = await supabase
      .from("users")
      .update({ full_name: validData.full_name })
      .eq("id", session.user.id);
    if (userError) throw userError;
  }

  const { city, ...restDetails } = validData;
  const detailsUpdate: any = { ...restDetails };

  Object.keys(detailsUpdate).forEach(key => detailsUpdate[key] === undefined && delete detailsUpdate[key]);
  delete detailsUpdate.full_name;

  if (city) {
    const { data: current } = await supabase
      .from("user_details")
      .select("additional_info")
      .eq("user_id", session.user.id)
      .single();
    
    const currentInfo = current?.additional_info || {};
    detailsUpdate.additional_info = { ...currentInfo, city };
  }

  if (Object.keys(detailsUpdate).length > 0) {
    const { error } = await supabase
      .from("user_details")
      .upsert({
        user_id: session.user.id,
        ...detailsUpdate
      }, { onConflict: 'user_id' });

    if (error) throw error;
  }

  return NextResponse.json({ success: true, message: "Profil güncellendi" });
});