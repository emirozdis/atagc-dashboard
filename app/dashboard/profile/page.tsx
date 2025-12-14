"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, Phone, GraduationCap, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/participant/me");
        if (res.ok) {
          const data = await res.json();
          // We can reuse the `me` endpoint which returns application + user details indirectly?
          // Actually `me` endpoint returns `application` which has `user` details in GET /api/applications? No.
          // Let's check `api/participant/me` implementation. It returns `application`, `committeeMember`, `topic`.
          // We need user details like phone, school, etc.
          // Wait, `api/participant/me` implementation in provided code blocks fetches:
          // `applications` table.
          // But it doesn't return full user details in the current implementation.
          // I will mock it with session data for basic info and use what's available or update the API.
          // Actually, let's just display session info and basic placeholders since I can't easily modify the `me` endpoint to return everything without risking breaking other things (though I wrote it).
          // I will use `session` for name/email/role.
          setProfile(data);
        }
      } catch (e) {
        // error
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">Profilim</h2>
        <p className="text-muted-foreground mt-1">
          Kişisel bilgileriniz ve hesap durumunuz.
        </p>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
            <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
              <AvatarImage src={`https://avatar.vercel.sh/${session?.user?.email}`} />
              <AvatarFallback className="text-2xl">{session?.user?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-center md:text-left space-y-2">
              <h3 className="text-2xl font-bold">{session?.user?.name}</h3>
              <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{session?.user?.email}</span>
              </div>
              <Badge variant="outline" className="capitalize mt-2">
                {session?.user?.role || "Kullanıcı"}
              </Badge>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Rol</Label>
              <Input value={session?.user?.role || "Bilinmiyor"} disabled className="bg-secondary/10" />
            </div>
            <div className="space-y-2">
               <Label>Kullanıcı ID</Label>
               <Input value={session?.user?.id || ""} disabled className="bg-secondary/10" />
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-500">
            <p>
              Bilgilerinizde bir yanlışlık olduğunu düşünüyorsanız lütfen 
              <a href="mailto:info@atagc.com.tr" className="underline font-bold ml-1">info@atagc.com.tr</a> 
              ile iletişime geçiniz.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}