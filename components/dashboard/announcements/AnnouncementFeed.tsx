"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, CalendarDays, Users, User, Globe, Trash2 } from "lucide-react";
import { Announcement } from "@/types/announcement";
import { sanitizeHtml } from "@/lib/sanitize";

interface AnnouncementFeedProps {
    announcements: Announcement[];
    onDelete?: (id: string) => void;
}

export function AnnouncementFeed({ announcements, onDelete }: AnnouncementFeedProps) {
    if (announcements.length === 0) {
        return (
            <Card className="bg-card border-dashed border-2 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <div className="bg-primary/10 p-4 rounded-full mb-4">
                        <Megaphone className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-lg font-medium">No announcements yet</p>
                    <p className="text-sm">New updates will appear here.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {announcements.map((item) => (
                <Card key={item.id} className="group bg-card border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-primary overflow-hidden relative">
                    <CardHeader className="pb-3">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-4">
                                <CardTitle className="text-xl font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                                    {item.title}
                                </CardTitle>

                                <div className="flex items-center gap-2 flex-wrap">
                                    {item.committee_ids && item.committee_ids.length > 0 ? (
                                        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 whitespace-nowrap max-w-[200px] truncate">
                                            <Users className="w-3 h-3 mr-1 shrink-0" />
                                            <span className="truncate">
                                                {item.committees_list && item.committees_list.length > 0
                                                    ? item.committees_list.map(c => c.name).join(", ")
                                                    : `${item.committee_ids.length} committee${item.committee_ids.length === 1 ? "" : "s"}`
                                                }
                                            </span>
                                        </Badge>
                                    ) : (item.target_user_ids && item.target_user_ids.length > 0) ? (
                                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 whitespace-nowrap">
                                            <User className="w-3 h-3 mr-1" />
                                            {item.target_user_ids.length === 1 ? "Private" : `${item.target_user_ids.length} people`}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 whitespace-nowrap">
                                            <Globe className="w-3 h-3 mr-1" /> Everyone
                                        </Badge>
                                    )}

                                    {onDelete && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(item.id);
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <CalendarDays className="w-3.5 h-3.5" />
                                    <span className="font-medium">
                                        {new Date(item.created_at).toLocaleDateString("en-GB", {
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
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-base leading-relaxed text-muted-foreground font-normal whitespace-pre-wrap break-words"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.content) }}
                        />
                        {(item.target_user_ids && item.target_user_ids.length > 0) && (
                            <p className="mt-2 text-xs text-muted-foreground italic border-t border-border/50 pt-2">
                                This announcement was sent privately.
                            </p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// Change Log:
// - Imported `sanitizeHtml`.
// - Replaced direct children rendering with `dangerouslySetInnerHTML` wrapped in `sanitizeHtml` to safely render rich text and prevent XSS.
// - Kept `whitespace-pre-wrap` to preserve formatting of newlines from the admin textarea.
