"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Megaphone, CalendarDays, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Announcement {
  id: string; // UUID
  title: string;
  content: string;
  created_at: string;
  author?: {
    full_name: string;
  };
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch("/api/announcements");
        if (res.ok) {
          const data = await res.json();
          setAnnouncements(data);
        }
      } catch (e) {
        toast.error("Duyurular yüklenemedi");
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">Duyurular</h2>
        <p className="text-muted-foreground mt-1">
          Etkinlik ve komiteler hakkında güncel bilgiler.
        </p>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
           <Card className="bg-card/50 border-dashed border-border/50">
             <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
               <Megaphone className="w-12 h-12 mb-4 opacity-20" />
               <p>Henüz duyuru bulunmuyor.</p>
             </CardContent>
           </Card>
        ) : (
          announcements.map((item) => (
            <Card key={item.id} className="bg-card/50 border-border/50 hover:bg-secondary/10 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                   <div className="space-y-1">
                     <CardTitle className="text-xl">{item.title}</CardTitle>
                     <div className="flex items-center gap-2 text-xs text-muted-foreground">
                       <CalendarDays className="w-3 h-3" />
                       {new Date(item.created_at).toLocaleDateString("tr-TR")}
                       {item.author && <span className="ml-2">• {item.author.full_name}</span>}
                     </div>
                   </div>
                   <Megaphone className="w-5 h-5 text-primary shrink-0 mt-1" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {item.content}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}