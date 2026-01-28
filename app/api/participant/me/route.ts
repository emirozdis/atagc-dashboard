import { NextResponse } from "next/server";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { rateLimit } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/api-handler";
import { getSignedUrl } from "@/lib/storage-utils";
import { updateProfileSchema } from "@/lib/schemas";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(60, ip);

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error(auth.message || 'Unauthorized');
  
  const session = auth.session;
  const userId = session.user.id;

  // Fetch all necessary data in one go efficiently using Supabase relations
  const { data: userData, error } = await supabase
    .from("users")
    .select(`
        id, full_name, email, role, created_at,
        user_details (
            id, phone_number, school_name, birth_date, profile_picture_url, 
            is_profile_picture_hidden, allow_connections, notification_preferences, additional_info
        ),
        user_warnings:user_warnings!user_warnings_user_id_fkey ( 
            id, reason, created_at, 
            issuer:users!user_warnings_issued_by_fkey(full_name, role) 
        ),
        application:applications ( id, status, submitted_at, review_notes ),
        committee_members (
            can_write,
            committee:committees (
                id, name, description,
                topic:topics ( title, description ),
                admin:users!committees_admin_id_fkey (
                    id, full_name, user_details ( profile_picture_url, is_profile_picture_hidden )
                )
            )
        ),
        managed_committees:committees (
            id, name, description,
            topic:topics ( title, description )
        )
    `)
    .eq("id", userId)
    .single();

  if (error) throw error;
  if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Cast to any to avoid complex TS inference issues with nested arrays/objects from Supabase
  const user = userData as any;

  // Unwrap Relations
  const details = Array.isArray(user.user_details) ? user.user_details[0] : user.user_details;
  const application = Array.isArray(user.application) ? user.application[0] : user.application;
  
  // Resolve Committee (Member OR Manager)
  let committeeData: any = null;
  const memberRecord = user.committee_members?.[0];
  const managedRecord = user.managed_committees?.[0];

  if (managedRecord) {
      committeeData = {
          ...managedRecord,
          role: 'manager',
          can_write: true, // Managers can always write
          topic: Array.isArray(managedRecord.topic) ? managedRecord.topic[0] : managedRecord.topic
      };
  } else if (memberRecord?.committee) {
      // Handle potential array return from Supabase relations
      const comm = Array.isArray(memberRecord.committee) ? memberRecord.committee[0] : memberRecord.committee;
      
      if (comm) {
          committeeData = {
              id: comm.id,
              name: comm.name,
              description: comm.description,
              role: 'member',
              can_write: memberRecord.can_write,
              topic: Array.isArray(comm.topic) ? comm.topic[0] : comm.topic,
              admin: Array.isArray(comm.admin) ? comm.admin[0] : comm.admin
          };
      }
  }

  // Profile Picture Signing
  if (details?.profile_picture_url) {
    details.profile_picture_url = await getSignedUrl("profile-pictures", details.profile_picture_url);
  }

  // Admin Profile Picture Signing (If applicable)
  if (committeeData?.admin?.user_details) {
      const adminDetails = Array.isArray(committeeData.admin.user_details) 
        ? committeeData.admin.user_details[0] 
        : committeeData.admin.user_details;
        
      if (adminDetails?.profile_picture_url && !adminDetails.is_profile_picture_hidden) {
          committeeData.admin.profile_picture_url = await getSignedUrl("profile-pictures", adminDetails.profile_picture_url);
      }
  }

  // Construct Clean Response
  const response = {
      profile: {
          ...user,
          details,
          user_details: undefined, // Remove raw relation
          user_warnings: user.user_warnings,
          committee_members: undefined,
          managed_committees: undefined,
          application: undefined
      },
      application: application || null,
      committee: committeeData
  };

  return NextResponse.json(response);
});

export const PUT = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(10, ip);

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const session = auth.session;

  const body = await request.json();
  const validData = updateProfileSchema.parse(body);

  // Update Users Table (Full Name)
  if (validData.full_name) {
    const { error: userError } = await supabase
      .from("users")
      .update({ full_name: validData.full_name })
      .eq("id", session.user.id);
    if (userError) throw userError;
  }

  // Update User Details Table
  const { city, ...restDetails } = validData;
  const detailsUpdate: any = { ...restDetails };

  Object.keys(detailsUpdate).forEach(key => detailsUpdate[key] === undefined && delete detailsUpdate[key]);
  delete detailsUpdate.full_name;

  if (city) {
    const { data: current } = await supabase
      .from("user_details")
      .select("additional_info")
      .eq("user_id", session.user.id)
      .maybeSingle();
    
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