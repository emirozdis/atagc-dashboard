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
          <Card className="bg-card border-dashed border-2 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <Megaphone className="w-8 h-8 text-primary" />
              </div>
              <p className="text-lg font-medium">Henüz duyuru bulunmuyor</p>
              <p className="text-sm">Yeni duyurular eklendiğinde burada görünecek.</p>
            </CardContent>
          </Card>
        ) : (
          announcements.map((item) => (
            <Card key={item.id} className="group bg-card border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-primary overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <CardTitle className="text-xl font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </CardTitle>
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span className="font-medium">
                          {new Date(item.created_at).toLocaleDateString("tr-TR", {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      {item.author && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span className="font-medium text-foreground/80">{item.author.full_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-base leading-relaxed whitespace-pre-wrap text-muted-foreground font-normal">
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