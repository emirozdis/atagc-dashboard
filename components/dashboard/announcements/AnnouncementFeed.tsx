"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, CalendarDays } from "lucide-react";
import { Announcement } from "@/types/announcement";

interface AnnouncementFeedProps {
    announcements: Announcement[];
}

export function AnnouncementFeed({ announcements }: AnnouncementFeedProps) {
    if (announcements.length === 0) {
        return (
            <Card className="bg-card border-dashed border-2 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <div className="bg-primary/10 p-4 rounded-full mb-4">
                        <Megaphone className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-lg font-medium">Henüz duyuru bulunmuyor</p>
                    <p className="text-sm">Yeni duyurular eklendiğinde burada görünecek.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {announcements.map((item) => (
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
            ))}
        </div>
    );
}
