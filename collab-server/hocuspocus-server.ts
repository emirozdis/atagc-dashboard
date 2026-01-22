// 0. Load Environment Variables
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env.local" });
dotenv.config();

import {
  Server,
  onLoadDocumentPayload,
  onStoreDocumentPayload,
  onAuthenticatePayload,
  onStatelessPayload
} from "@hocuspocus/server";
import { createClient } from "@supabase/supabase-js";
import { decode } from "next-auth/jwt";
import { encodeStateAsUpdate, applyUpdate } from "yjs";
import { IncomingMessage } from "http";

const CONFIG = {
  port: parseInt(process.env.NEXT_PUBLIC_COLLAB_PORT || "1234", 10),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SECRET_SERVICE_ROLE_KEY!,
  nextAuthSecret: process.env.NEXTAUTH_SECRET!,
  docPrefix: "committee-",
};

if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey || !CONFIG.nextAuthSecret) {
  console.error("❌ Critical Error: Missing Environment Variables");
  process.exit(1);
}

// Use Service Role to bypass RLS for auth checks
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

interface ConnectionContext {
  user: {
    id: string; // UUID
    name: string;
    role: string;
    color?: string;
  };
  readOnly: boolean;
  userId: string; // UUID
  role: string;
}

interface PermissionUpdateMessage {
  type: 'PERMISSION_UPDATE';
  userId: string;
  canWrite: boolean;
}

const getCommitteeId = (documentName: string): string | null => {
  const id = documentName.replace(CONFIG.docPrefix, "");
  // Basic validation that it's not empty
  return id.length > 0 ? id : null;
};

// Helper to extract session token from cookies
const getSessionToken = (request: IncomingMessage): string | undefined => {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return undefined;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const tokenCookie = cookies.find(c => c.startsWith('__Secure-next-auth.session-token='))
    ?? cookies.find(c => c.startsWith('next-auth.session-token='));
  return tokenCookie?.split('=')[1];
};

const parseDocumentBlob = (blob: string | Uint8Array): Uint8Array => {
  if (typeof blob === 'string') {
    const hex = blob.startsWith('\\x') ? blob.slice(2) : blob;
    return new Uint8Array(Buffer.from(hex, 'hex'));
  }
  return new Uint8Array(blob);
};

// --- HANDLERS ---

const handleLoadDocument = async (data: onLoadDocumentPayload) => {
  const committeeId = getCommitteeId(data.documentName);
  if (!committeeId) return null;

  console.log(`[LOAD] Fetching document for Committee ${committeeId}...`);

  const { data: doc, error } = await supabase
    .from("committee_documents")
    .select("document_blob")
    .eq("committee_id", committeeId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error(`[LOAD] Database error for ${committeeId}:`, error);
    } else {
      console.log(`[LOAD] No existing document found for ${committeeId}. Creating new.`);
    }
    return null;
  }

  if (doc?.document_blob) {
    try {
      const binaryData = parseDocumentBlob(doc.document_blob);
      console.log(`[LOAD] Loaded ${binaryData.byteLength} bytes for Committee ${committeeId}. Applying update...`);
      applyUpdate(data.document, binaryData);
      return data.document;
    } catch (e) {
      console.error(`[LOAD] Error parsing blob for ${committeeId}:`, e);
      return null;
    }
  }
  return null;
};

const handleStoreDocument = async (data: onStoreDocumentPayload) => {
  const committeeId = getCommitteeId(data.documentName);
  if (!committeeId) return;

  console.log(`[SAVE] Persisting Committee ${committeeId} (Clients: ${data.clientsCount})`);

  try {
    const update = encodeStateAsUpdate(data.document);
    const blob = Buffer.from(update).toString('hex');

    const { error } = await supabase.from("committee_documents").upsert(
      {
        committee_id: committeeId,
        document_blob: `\\x${blob}`,
        updated_at: new Date().toISOString()
      },
      { onConflict: "committee_id" }
    );

    if (error) console.error(`[SAVE] DB Error for ${committeeId}:`, error);
  } catch (e) {
    console.error(`[SAVE] Exception for ${committeeId}:`, e);
  }
};

const handleStatelessMessage = async (data: onStatelessPayload) => {
  const { payload, document, connection } = data;
  const context = connection.context as ConnectionContext;

  try {
    const msg = JSON.parse(payload) as PermissionUpdateMessage;

    if (msg.type === 'PERMISSION_UPDATE') {
      // Only Chairman or Superadmin can change permissions dynamically
      if (context?.role === 'committee_chairman' || context?.role === 'superadmin') {
        const targetUserId = msg.userId;
        const newCanWrite = msg.canWrite;

        document.getConnections().forEach((conn) => {
          const connContext = conn.context as ConnectionContext;
          if (connContext?.userId == targetUserId) {
            conn.readOnly = !newCanWrite;
            connContext.readOnly = !newCanWrite;
          }
        });

        // Broadcast to other clients so they can update UI toast
        document.getConnections().forEach((conn) => {
          if (conn !== connection) {
            conn.sendStateless(payload);
          }
        });
      } else {
        console.warn(`Unauthorized permission change attempt by ${context.user.id}`);
      }
    }
  } catch (e) {
    console.error("Error processing message", e);
  }
};

const handleAuthentication = async (data: onAuthenticatePayload): Promise<ConnectionContext> => {
  const { request, documentName } = data;

  const tokenValue = getSessionToken(request);
  if (!tokenValue) throw new Error("Unauthorized: No session token found in cookies.");

  const token = await decode({ token: tokenValue, secret: CONFIG.nextAuthSecret });
  if (!token || !token.sub) throw new Error("Unauthorized: Invalid session.");

  const userId = token.sub;
  const committeeId = getCommitteeId(documentName);

  if (!committeeId) throw new Error("Invalid document name.");

  // Fetch User Role & Committee Details
  const { data: user, error } = await supabase
    .from("users")
    .select(`
      role,
      full_name,
      email,
      committee_members ( committee_id, can_write ),
      committees!committees_admin_id_fkey ( id ) 
    `)
    .eq("id", userId)
    .single();

  if (error || !user) throw new Error("User not found.");

  const role = user.role;

  const baseContext = {
    user: {
      id: userId,
      name: user.full_name,
      role: role
    },
    userId: userId,
    role: role
  };

  // 1. Superadmin: Read-Only (Auditor)
  if (role === 'superadmin') {
    return { ...baseContext, readOnly: true };
  }

  // 2. Committee Chairman: Write Access (If Owner)
  if (role === 'committee_chairman') {
    const rawCommittees = user.committees as unknown;
    const adminCommittees: { id: string }[] = Array.isArray(rawCommittees) ? rawCommittees : (rawCommittees ? [rawCommittees] : []);
    const isChairmanOfThis = adminCommittees.some(c => c.id === committeeId);
    
    if (isChairmanOfThis) {
      return { ...baseContext, readOnly: false };
    }
    throw new Error("Forbidden: You are not the chairman of this committee.");
  }

  // 3. Deputy Chair & Delegates: Check Membership
  const memberCommittee = Array.isArray(user.committee_members)
    ? user.committee_members[0]
    : user.committee_members;

  if (memberCommittee?.committee_id === committeeId) {
    
    // Explicit Fix for Deputy Chair: Always Grant Write Access
    if (role === 'deputy_chair') {
      return { ...baseContext, readOnly: false };
    }

    // Delegates/Press/Observers: Check database permission
    const canWrite = memberCommittee.can_write === true;
    return {
      ...baseContext,
      readOnly: !canWrite
    };
  }

  throw new Error("Forbidden: You are not a member of this committee.");
};

const server = new Server({
  port: CONFIG.port,
  onLoadDocument: handleLoadDocument,
  onStoreDocument: handleStoreDocument,
  onStateless: handleStatelessMessage,
  onAuthenticate: handleAuthentication,
});

server.listen().then(() => {
  console.log(`🚀 Collaboration Server ready on port ${CONFIG.port}`);
});

// Change Log:
// - Updated `handleAuthentication` to specifically check for `deputy_chair`.
// - If `role === 'deputy_chair'` and they are a member of the committee, `readOnly` is forced to `false`.
// - This bypasses the `can_write` DB check for deputies, treating them as leaders.