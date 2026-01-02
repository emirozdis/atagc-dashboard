import { useState, useEffect } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function useSupabaseRealtime() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    const initClient = async () => {
      try {
        const res = await fetch("/api/auth/supabase-token");
        if (!res.ok) return;
        
        const { token } = await res.json();

        const client = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            // Inject the token into REST requests
            global: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
            // Inject the token into Realtime WebSocket
            realtime: {
              params: {
                apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
              },
            },
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false
            },
          }
        );

        // Explicitly authenticate the Realtime connection
        client.realtime.setAuth(token);

        setSupabase(client);
      } catch (error) {
        console.error("Supabase init error:", error);
      }
    };

    initClient();
  }, []);

  return supabase;
}