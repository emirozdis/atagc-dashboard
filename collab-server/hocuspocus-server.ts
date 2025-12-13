// 0. Load Environment Variables
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); 
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

// 1. Setup Environment
const port = parseInt(process.env.COLLAB_PORT || "1234", 10);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SECRET_SERVICE_ROLE_KEY!;
const nextAuthSecret = process.env.NEXTAUTH_SECRET!;

if (!supabaseUrl || !supabaseServiceKey || !nextAuthSecret) {
  console.error("Missing Environment Variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 2. Configure Hocuspocus
const server = new Server({
  port,
  
  // --- PERSISTENCE: LOAD ---
  async onLoadDocument(data: onLoadDocumentPayload) {
    const committeeId = parseInt(data.documentName.replace("committee-", ""));
    if (isNaN(committeeId)) return null;

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
        let binaryData: Uint8Array;

        if (typeof doc.document_blob === 'string') {
            const hex = doc.document_blob.startsWith('\\x') ? doc.document_blob.slice(2) : doc.document_blob;
            binaryData = new Uint8Array(Buffer.from(hex, 'hex'));
        } else {
            binaryData = new Uint8Array(doc.document_blob);
        }

        console.log(`[LOAD] Loaded ${binaryData.byteLength} bytes for Committee ${committeeId}. Applying update...`);
        applyUpdate(data.document, binaryData);
        return data.document;
      } catch (e) {
        console.error(`[LOAD] Error parsing blob for ${committeeId}:`, e);
        return null; 
      }
    }
    return null;
  },

  // --- PERSISTENCE: SAVE ---
  async onStoreDocument(data: onStoreDocumentPayload) {
    const committeeId = parseInt(data.documentName.replace("committee-", ""));
    if (isNaN(committeeId)) return;

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
  },

  // --- STATELESS MESSAGING (For Instant Permissions) ---
  async onStateless(data: onStatelessPayload) {
    const { payload, document, connection } = data;
    
    try {
        const msg = JSON.parse(payload);
        
        // INTERCEPT PERMISSION UPDATES
        if (msg.type === 'PERMISSION_UPDATE') {
            const senderRole = connection.context?.role;
            
            // Only allow Chairmans or Admins to change permissions
            if (senderRole === 'committee_chairman' || senderRole === 'superadmin') {
                const targetUserId = msg.userId;
                const newCanWrite = msg.canWrite;

                // Iterate over all connections to find the target user(s) and update their readOnly state LIVE
                document.getConnections().forEach((conn) => {
                    // Check if this connection belongs to the target user
                    // We check loose equality because one might be string vs number
                    if (conn.context?.userId == targetUserId) {
                        conn.readOnly = !newCanWrite;
                        console.log(`[PERM] Updated connection for User ${targetUserId} to ReadOnly=${conn.readOnly}`);
                    }
                });
            } else {
                console.warn(`[PERM] Unauthorized permission update attempt by role: ${senderRole}`);
            }
        }
    } catch (e) {
        console.error("Error parsing stateless message:", e);
    }

    // Broadcast the stateless message to all other connections so UI can update
    document.getConnections().forEach((conn) => {
      if (conn !== connection) {
        conn.sendStateless(payload);
      }
    });
  },

  // --- AUTHENTICATION & ROLES ---
  async onAuthenticate(data: onAuthenticatePayload) {
    const { request, documentName } = data;
    
    const cookieHeader = request.headers.cookie;
    const tokenValue = cookieHeader?.split(';')
        .find((c: string) => c.trim().startsWith('next-auth.session-token='))
        ?.split('=')[1] 
        ?? cookieHeader?.split(';')
        .find((c: string) => c.trim().startsWith('__Secure-next-auth.session-token='))
        ?.split('=')[1];

    if (!tokenValue) throw new Error("Unauthorized: No session token.");

    const token = await decode({ token: tokenValue, secret: nextAuthSecret });

    if (!token || !token.sub) throw new Error("Unauthorized: Invalid session.");

    const userId = token.sub;
    const committeeId = parseInt(documentName.replace("committee-", ""));

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
    const rawCommittees = user.committees as unknown;
    const adminCommittees: { id: number }[] = Array.isArray(rawCommittees) ? rawCommittees : (rawCommittees ? [rawCommittees] : []);
    const memberCommittee = Array.isArray(user.committee_members) ? user.committee_members[0] : user.committee_members;

    // Build context object to attach to connection
    const context = {
        userId: userId,
        role: role,
        name: user.full_name
    };

    if (role === 'superadmin') {
      return { 
          user: { id: userId, name: user.full_name, role: 'superadmin' }, 
          readOnly: true, // Superadmin views as read-only by default (can toggle if implemented)
          context 
      };
    }

    if (role === 'committee_chairman') {
      const isChairmanOfThis = adminCommittees.some(c => c.id === committeeId);
      if (isChairmanOfThis) {
        return { 
            user: { id: userId, name: user.full_name, role: 'chairman' }, 
            readOnly: false,
            context
        };
      }
      throw new Error("Forbidden: You are not the chairman of this committee.");
    }

    if (role === 'applicant') {
      if (memberCommittee?.committee_id === committeeId) {
        const canWrite = memberCommittee.can_write === true; 
        return { 
            user: { id: userId, name: user.full_name, role: 'applicant' }, 
            readOnly: !canWrite,
            context
        };
      }
      throw new Error("Forbidden: You are not a member of this committee.");
    }

    throw new Error("Forbidden: Role not authorized.");
  },
});

server.listen().then(() => {
  console.log(`🚀 Collaboration Server ready on port ${port}`);
});

// Change Log:
// - Updated `onAuthenticate` to return a `context` object containing `userId` and `role`. This context is attached to the connection.
// - Updated `onStateless` to intercept `PERMISSION_UPDATE` messages.
// - Implemented logic in `onStateless` to verify the sender is a chairman/admin.
// - Implemented logic in `onStateless` to find the target user's connection(s) and update their `readOnly` property instantly.
// - This ensures that even if the client-side code is bypassed, the server enforces the new permission immediately on the WebSocket connection level.