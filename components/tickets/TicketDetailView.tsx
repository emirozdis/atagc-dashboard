"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ticket, TICKET_STATUSES, TICKET_CATEGORIES } from "@/types/ticket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
    Loader2, Send, Paperclip, User, ShieldAlert, Lock, 
    ArrowLeft, ExternalLink, Calendar, X, FileText, AlertCircle 
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TicketDetailViewProps {
    ticketId: string;
    accessToken?: string;
    isAdmin?: boolean;
    onBack?: () => void;
}

interface ReplyVariables {
    message: string;
    files: File[];
}

export function TicketDetailView({ ticketId, accessToken, isAdmin = false, onBack }: TicketDetailViewProps) {
    const queryClient = useQueryClient();
    const [reply, setReply] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchUrl = accessToken
        ? `/api/tickets/${ticketId}?token=${accessToken}`
        : `/api/tickets/${ticketId}`;

    const { data: ticket, isLoading, refetch } = useQuery<Ticket>({
        queryKey: ['ticket', ticketId],
        queryFn: async () => {
            const res = await fetch(fetchUrl);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        }
    });

    const replyMutation = useMutation<unknown, Error, ReplyVariables, { previousTicket?: Ticket }>({
        mutationFn: async ({ message, files }: ReplyVariables) => {
            const formData = new FormData();
            formData.append("message", message);
            if (accessToken) {
                formData.append("accessToken", accessToken);
            }
            files.forEach(f => formData.append("files", f));

            const res = await fetch(`/api/tickets/${ticketId}`, {
                method: "POST",
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed");
            }
        },
        onMutate: async ({ message }) => {
            await queryClient.cancelQueries({ queryKey: ['ticket', ticketId] });

            const previousTicket = queryClient.getQueryData<Ticket>(['ticket', ticketId]);

            if (previousTicket && message.trim()) {
            const newMessage = {
                    id: `temp-${Date.now()}`,
                    ticket_id: ticketId,
                    sender_id: null,
                    message: message,
                    attachments: [], 
                    is_staff_reply: isAdmin,
                    created_at: new Date().toISOString(),
                    sender: {
                        full_name: isAdmin ? "Administrator (you)" : "You",
                        role: isAdmin ? "admin" : "applicant"
                    }
                };

                queryClient.setQueryData(['ticket', ticketId], {
                    ...previousTicket,
                    messages: [...(previousTicket.messages || []), newMessage]
                });
            }

            // Clear inputs immediately for snappy UI
            setReply("");
            setFiles([]);

            return { previousTicket };
        },
        onError: (err, variables, context) => {
            if (context?.previousTicket) {
                queryClient.setQueryData(['ticket', ticketId], context.previousTicket);
            }
            // Restore text if it failed
            setReply(variables.message);
            setFiles(variables.files);
            toast.error(err.message);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
        }
    });

    const statusMutation = useMutation({
        mutationFn: async (status: string) => {
            const res = await fetch(`/api/tickets/${ticketId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error("Failed");
        },
        onSuccess: (data, status) => {
            if (status === 'closed') {
                toast.success("Ticket closed successfully");
            } else {
                toast.success("Status updated");
            }
            setIsCloseDialogOpen(false);
            refetch();
        },
        onError: () => toast.error("Action failed")
    });

    const handleSend = () => {
        if (!reply.trim() && files.length === 0) return;
        replyMutation.mutate({ message: reply, files });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col relative min-h-[calc(100vh-8rem)]">
                <div className="flex-shrink-0 rounded-2xl border border-border/50 bg-background/95 mb-6">
                    <div className="px-6 py-4 md:px-8">
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
                            <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-3">
                                    <div className="h-7 w-48 bg-muted rounded animate-pulse" />
                                    <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    if (!ticket) return <div className="flex-1 flex items-center justify-center h-full text-muted-foreground">Ticket not found.</div>;

    const statusMeta = TICKET_STATUSES.find(s => s.value === ticket.status);
    const categoryLabel = TICKET_CATEGORIES.find(c => c.value === ticket.category)?.label;
    const isClosed = ticket.status === 'closed';

    return (
        <div className="flex flex-col relative min-h-[calc(100vh-8rem)]">
            <div className="sticky top-0 z-30 flex-shrink-0 rounded-2xl border border-border/50 bg-background/95 backdrop-blur shadow-sm mb-6">
                <div className="px-6 py-4 md:px-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                            {onBack && (
                                <Button variant="ghost" size="icon" onClick={onBack} className="mt-1 h-8 w-8 -ml-2">
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            )}
                            <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="text-xl md:text-2xl font-bold font-display leading-tight">{ticket.subject}</h2>
                                    <Badge className={cn("text-xs font-medium px-2.5 py-0.5 border shadow-sm", statusMeta?.color)}>{statusMeta?.label}</Badge>
                                    {ticket.is_anonymous && <Badge variant="secondary" className="text-[10px] font-normal border-border/50">Anonymous</Badge>}
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1.5 bg-secondary/30 px-2 py-0.5 rounded text-xs">
                                        <span className="font-medium text-foreground">{categoryLabel}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{new Date(ticket.created_at).toLocaleString('en-GB')}</span>
                                    </div>
                                    {ticket.user && (
                                        <div className="flex items-center gap-1.5 border-l border-border/50 pl-4">
                                            <User className="w-3.5 h-3.5" />
                                            <span className="font-medium text-foreground truncate max-w-[120px]">{ticket.user.full_name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isAdmin && !isClosed && (
                            <div className="flex gap-2 shrink-0">
                                {ticket.status !== 'reviewing' && ticket.status !== 'answered' && (
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => statusMutation.mutate('reviewing')} 
                                        className="h-9"
                                        disabled={statusMutation.isPending}
                                    >
                                        Mark under review
                                    </Button>
                                )}
                                
                                <AlertDialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="destructive" className="h-9 shadow-sm">
                                            Close ticket
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
                                                <AlertCircle className="w-6 h-6 text-destructive" />
                                            </div>
                                            <AlertDialogTitle className="text-center">Close this ticket?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-center">
                                                Once confirmed, this ticket <strong>will be permanently closed</strong>.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="sm:justify-center gap-3">
                                            <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
                                            <AlertDialogAction 
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    statusMutation.mutate('closed');
                                                }} 
                                                className="bg-destructive text-white"
                                                disabled={statusMutation.isPending}
                                            >
                                                {statusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                Yes, close ticket
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-0">
                <div className="space-y-8 max-w-4xl mx-auto pb-40 px-4">
                    {ticket.messages?.map((msg) => {
                        const isStaff = msg.is_staff_reply;
                        const alignRight = isAdmin ? isStaff : !isStaff;
                        const isTemp = String(msg.id).startsWith('temp-');

                        return (
                            <div key={msg.id} className={cn("flex gap-4 max-w-[95%] sm:max-w-[90%]", alignRight ? "ml-auto flex-row-reverse" : "", isTemp && "opacity-70")}>
                                <div className={cn(
                                    "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 border shadow-sm mt-1",
                                    isStaff
                                        ? "bg-primary/10 border-primary/20 text-primary"
                                        : "bg-secondary border-border text-muted-foreground"
                                )}>
                                    {isStaff ? <ShieldAlert className="w-4 h-4 md:w-5 md:h-5" /> : <User className="w-4 h-4 md:w-5 md:h-5" />}
                                </div>
                                <div className={cn(
                                    "space-y-2 p-4 md:p-5 rounded-2xl text-sm shadow-sm border relative group min-w-[150px] sm:min-w-[200px]",
                                    alignRight
                                        ? "bg-primary text-primary-foreground border-primary/20 rounded-tr-sm"
                                        : "bg-card border-border/60 rounded-tl-sm"
                                )}>
                                    <div className={cn(
                                        "flex justify-between items-baseline gap-4 text-[10px] pb-2 mb-2 border-b",
                                        alignRight ? "border-white/20 opacity-90" : "border-border/50 text-muted-foreground"
                                    )}>
                                        <span className="font-bold uppercase tracking-wide">
                                            {msg.sender?.full_name || (isStaff ? "Staff" : "Participant")}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            {isTemp && <Loader2 className="w-2 h-2 animate-spin" />}
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className="prose prose-sm dark:prose-invert max-w-none break-words whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                                        {msg.message}
                                    </div>

                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className={cn(
                                            "pt-4 flex flex-wrap gap-2",
                                            msg.message && (alignRight ? "border-t border-white/20 mt-3" : "border-t border-border/50 mt-3")
                                        )}>
                                            {msg.attachments.map((url, i) => (
                                                <Button
                                                    key={i}
                                                    variant="secondary"
                                                    size="sm"
                                                    asChild
                                                    className={cn(
                                                        "h-8 text-[10px] md:text-xs border shadow-sm",
                                                        alignRight ? "bg-white/20 hover:bg-white/30 text-primary-foreground border-transparent" : "bg-background hover:bg-accent border-border"
                                                    )}
                                                >
                                                    <a href={url} target="_blank" rel="noopener noreferrer">
                                                        <Paperclip className="w-3.5 h-3.5 mr-2" /> Attachment {i + 1}
                                                        <ExternalLink className="w-3 h-3 ml-2 opacity-70" />
                                                    </a>
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="sticky bottom-0 z-30 shrink-0 px-0 pb-4 md:pb-8 pointer-events-none mt-auto">
                <div className="max-w-4xl mx-auto pointer-events-auto">
                    <div className="bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-3 md:p-4">
                        {isClosed ? (
                            <div className="p-4 md:p-6 bg-secondary/10 border border-border/50 rounded-xl text-center text-muted-foreground flex flex-col items-center gap-3">
                                <div className="p-2 md:p-3 bg-secondary rounded-full">
                                    <Lock className="w-5 h-5 md:w-6 md:h-6 opacity-50" />
                                </div>
                                <p className="font-medium text-foreground text-sm md:text-base">This ticket is closed.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {files.length > 0 && (
                                    <div className="p-2 flex flex-wrap gap-2 animate-in fade-in">
                                        {files.map((file, i) => (
                                            <Badge key={i} variant="secondary" className="pl-2 pr-1 py-1 gap-1 text-xs">
                                                <FileText className="w-3 h-3" />
                                                <span className="truncate max-w-[120px] sm:max-w-[200px]">{file.name}</span>
                                                <button
                                                    onClick={() => setFiles(files.filter(f => f !== file))}
                                                    className="ml-1 p-0.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-end gap-2 p-1.5 bg-card border border-input rounded-xl shadow-sm has-[:focus-within]:ring-2 has-[:focus-within]:ring-ring has-[:focus-within]:border-primary transition-all">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept="image/*,.pdf"
                                        onChange={(e) => {
                                            if (e.target.files) {
                                                const newFiles = Array.from(e.target.files);
                                                setFiles(prev => [...prev, ...newFiles].slice(0, 3));
                                            }
                                        }}
                                        className="hidden"
                                        disabled={files.length >= 3 || replyMutation.isPending}
                                    />
                                    <button
                                        type="button"
                                        className={cn("p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors shrink-0", files.length >= 3 && "opacity-50 cursor-not-allowed")}
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={files.length >= 3 || replyMutation.isPending}
                                    >
                                        <Paperclip className="w-5 h-5" />
                                    </button>

                                    <Textarea
                                        placeholder="Write your reply here..."
                                        value={reply}
                                        onChange={(e) => setReply(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        className="min-h-[40px] max-h-[200px] h-10 resize-none bg-transparent border-none focus-visible:ring-0 shadow-none p-2 text-sm md:text-base transition-all"
                                    />
                                    <Button
                                        size="icon"
                                        className="shrink-0 rounded-lg w-10 h-10"
                                        onClick={handleSend}
                                        disabled={(!reply.trim() && files.length === 0) || replyMutation.isPending}
                                    >
                                        {replyMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
