"use client";

import { useEffect } from "react";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function ConnectionNotification() {
    const supabase = useSupabaseRealtime();
    const { data: session } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (!supabase || !session?.user?.id) return;

        const channel = supabase
            .channel(`connections-${session.user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'user_connections',
                    filter: `recipient_id=eq.${session.user.id}`
                },
                (payload) => {
                    if (payload.new.status === 'pending') {
                        toast("New connection request", {
                            description: "Someone would like to connect with you.",
                            icon: <UserPlus className="w-5 h-5 text-primary" />,
                            action: {
                                label: "View",
                                onClick: () => router.push("/dashboard/connections")
                            },
                            duration: 5000
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, session, router]);

    return null;
}
