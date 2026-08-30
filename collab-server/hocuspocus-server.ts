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
import { decode } from "next-auth/jwt";
import { encodeStateAsUpdate, applyUpdate } from "yjs";
import { IncomingMessage } from "http";
import { supabase } from "../lib/SERVER_supabase";

const CONFIG = {
  port: parseInt(process.env.COLLAB_PORT || process.env.NEXT_PUBLIC_COLLAB_PORT || "1234", 10),
  nextAuthSecret: process.env.NEXTAUTH_SECRET!,
  docPrefix: "committee-",
  snapshotInterval: 1000 * 60 * 10, // 10 Minutes
};

if (!process.env.DATABASE_URL || !CONFIG.nextAuthSecret) {
  console.error("❌ Critical Error: Missing Environment Variables");
  process.exit(1);
}


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
  committeeId: string;
}

// Memory store for debounce timers per document
const lastSnapshotTime: Record<string, number> = {};

const getCommitteeId = (documentName: string): string | null => {
  const id = documentName.replace(CONFIG.docPrefix, "");
  return id.length > 0 ? id : null;
};

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

  // 1. Prepare Binary
  const update = encodeStateAsUpdate(data.document);
  const blob = Buffer.from(update).toString('hex');
  const pgBlob = `\\x${blob}`;
  const now = Date.now();

  try {
    // 2. Save Head (Current State) - Always
    const { error } = await supabase.from("committee_documents").upsert(
      {
        committee_id: committeeId,
        document_blob: pgBlob,
        updated_at: new Date().toISOString()
      },
      { onConflict: "committee_id" }
    );

    if (error) console.error(`[SAVE] DB Error for ${committeeId}:`, error);

    // 3. Auto-Snapshot Logic
    const lastSnap = lastSnapshotTime[committeeId] || 0;
    if (now - lastSnap > CONFIG.snapshotInterval) {
        console.log(`[SNAPSHOT] Creating auto-save for ${committeeId}`);
        
        await supabase.from("document_versions").insert({
            committee_id: committeeId,
            document_blob: pgBlob,
            version_name: "Automatic save",
            is_auto_save: true,
            created_at: new Date().toISOString()
        });

        lastSnapshotTime[committeeId] = now;
    }

  } catch (e) {
    console.error(`[SAVE] Exception for ${committeeId}:`, e);
  }
};

const handleStatelessMessage = async (data: onStatelessPayload) => {
  const { payload, document, connection } = data;
  const context = connection.context as ConnectionContext;

  try {
    const msg = JSON.parse(payload);

    // Permission Update Handler
    if (msg.type === 'PERMISSION_UPDATE') {
      const canManagePermissions = context?.committeeId === getCommitteeId(data.documentName)
        && ['committee_chairman', 'chair', 'admin', 'superadmin'].includes(context?.role || '');
      if (canManagePermissions && typeof msg.userId === 'string' && typeof msg.canWrite === 'boolean') {
        const targetUserId = msg.userId;
        const newCanWrite = msg.canWrite;

        const { data: targetAssignment } = await supabase
          .from("conference_assignments")
          .select("user_id")
          .eq("user_id", targetUserId)
          .eq("committee_id", context.committeeId)
          .maybeSingle();
        if (!targetAssignment) return;

        document.getConnections().forEach((conn) => {
          const connContext = conn.context as ConnectionContext;
          if (connContext?.userId == targetUserId) {
            conn.readOnly = !newCanWrite;
            connContext.readOnly = !newCanWrite;
          }
        });

        document.getConnections().forEach((conn) => {
          if (conn !== connection) {
            conn.sendStateless(payload);
          }
        });
      }
    }

    // Force Refresh Handler (Used after Restore)
    if (msg.type === 'FORCE_REFRESH') {
        if (!context || context.committeeId !== getCommitteeId(data.documentName) || !['committee_chairman', 'chair', 'admin', 'superadmin'].includes(context.role)) return;
        console.log(`[REFRESH] Force refresh signal received for ${data.documentName}`);
        // Broadcast to all clients to reload page
        document.getConnections().forEach((conn) => {
            conn.sendStateless(JSON.stringify({ type: 'client_reload', message: 'Document restored. Reloading...' }));
        });
        
        // Wait a moment for messages to send, then disconnect everyone to force re-fetch from DB
        setTimeout(() => {
            document.getConnections().forEach(conn => conn.close()); 
        }, 1000);
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

  const { data: user, error } = await supabase.from("users").select("role, account_role, full_name, email").eq("id", userId).single();
  if (error || !user) throw new Error("User not found.");

  const role = user.account_role === 'super_admin' ? 'superadmin' : user.account_role === 'site_admin' ? 'admin' : user.role;
  const { data: assignment } = await supabase.from("conference_assignments").select("role, committee_id").eq("user_id", userId).eq("committee_id", committeeId).maybeSingle();
  const { data: legacyMembership } = await supabase.from("committee_members").select("committee_id, can_write").eq("user_id", userId).eq("committee_id", committeeId).maybeSingle();

  const baseContext = {
    user: {
      id: userId,
      name: user.full_name,
      role: role
    },
    userId: userId,
    role: role,
    committeeId
  };

  // 1. Superadmin: Read-Only
  if (role === 'superadmin') {
    return { ...baseContext, readOnly: true };
  }
  if (role === 'admin') {
    return { ...baseContext, readOnly: true };
  }

  // 2. Committee Chairman: Write Access (If Owner)
  if (role === 'committee_chairman') {
    if (assignment?.role === 'committee_chairman' && assignment.committee_id === committeeId) {
      return { ...baseContext, readOnly: false };
    }
    throw new Error("Forbidden: You are not the chairman of this committee.");
  }

  // 3. Deputy Chair & Delegates
  if (assignment?.committee_id === committeeId || legacyMembership?.committee_id === committeeId) {
    if (role === 'chair' || assignment?.role === 'chair') {
      return { ...baseContext, readOnly: false };
    }
    const canWrite = legacyMembership?.can_write === true;
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
// - Added `lastSnapshotTime` to track auto-save intervals.
// - Updated `handleStoreDocument` to perform snapshot inserts into `document_versions`.
// - Added `FORCE_REFRESH` handler in `handleStatelessMessage` to support restoration flow.
