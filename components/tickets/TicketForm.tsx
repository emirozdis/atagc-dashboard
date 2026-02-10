"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createTicketSchema } from "@/lib/schemas";
import { TICKET_CATEGORIES } from "@/types/ticket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Paperclip, Send, ShieldAlert, CheckCircle2, Copy, X, FileText, Key, Hash, Lock, Info } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface TicketFormProps {
    isLoggedIn: boolean;
    onSubmitSuccess?: () => void;
}

type TicketFormValues = z.output<typeof createTicketSchema>;

export function TicketForm({ isLoggedIn, onSubmitSuccess }: TicketFormProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [successData, setSuccessData] = useState<{ ticketId: string, accessToken: string } | null>(null);

    const form = useForm<TicketFormValues>({
        resolver: zodResolver(createTicketSchema) as any,
        defaultValues: {
            category: "general",
            subject: "",
            message: "",
            is_anonymous: false
        }
    });

    const isAnonymous = form.watch("is_anonymous");

    const mutation = useMutation<any, Error, TicketFormValues>({
        mutationFn: async (data) => {
            const formData = new FormData();
            formData.append("category", data.category);
            formData.append("subject", data.subject);
            formData.append("message", data.message);
            formData.append("is_anonymous", String(data.is_anonymous));

            files.forEach(f => formData.append("files", f));

            const res = await fetch("/api/tickets", {
                method: "POST",
                body: formData
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed");
            }
            return res.json();
        },
        onSuccess: (data) => {
            if (form.getValues("is_anonymous")) {
                setSuccessData(data);
            } else {
                toast.success("Bildiriminiz gönderildi.", { description: "Taleplerim sekmesinden takip edebilirsiniz." });
                form.reset();
                setFiles([]);
                if (onSubmitSuccess) onSubmitSuccess();
            }
        },
        onError: (err: any) => toast.error(err.message)
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles].slice(0, 3));
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files) {
            const newFiles = Array.from(e.dataTransfer.files);
            setFiles(prev => [...prev, ...newFiles].slice(0, 3));
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} kopyalandı`);
    };

    if (!isLoggedIn) {
        return (
            <Card className="border-border/50 bg-card/50 shadow-lg text-center p-12">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Giriş Yapmalısınız</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    Destek talebi oluşturabilmek için sistemde oturum açmış olmanız gerekmektedir. Anonim taleplerde bile kimlik doğrulaması zorunludur.
                </p>
                <Button asChild>
                    <a href="/login">Giriş Ekranına Git</a>
                </Button>
            </Card>
        );
    }

    if (successData) {
        return (
            <Card className="border-border/50 bg-card animate-in zoom-in-95 duration-500 shadow-2xl overflow-hidden">
                <div className="h-2 bg-primary w-full" />
                <CardHeader className="text-center pt-8">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-10 h-10 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-display font-bold">Bildiriminiz Alındı</CardTitle>
                    <CardDescription className="max-w-xs mx-auto">
                        Anonim bildiriminiz başarıyla iletildi. Gizliliğiniz için bu bilet hesabınızla ilişkilendirilmemiştir.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 px-6 md:px-10">
                    <div className="grid gap-4 bg-secondary/30 p-6 rounded-2xl border border-border/50">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                                <Hash className="w-3 h-3" /> Takip Numarası (Ticket ID)
                            </div>
                            <div className="flex gap-2">
                                <code className="flex-1 bg-background border border-border/50 px-4 py-2.5 rounded-lg font-mono text-sm break-all flex items-center">
                                    {successData.ticketId}
                                </code>
                                <Button 
                                    size="icon" 
                                    variant="secondary" 
                                    className="h-10 w-10 shrink-0"
                                    onClick={() => copyToClipboard(successData.ticketId, "Takip numarası")}
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                                <Key className="w-3 h-3" /> Erişim Anahtarı (Access Token)
                            </div>
                            <div className="flex gap-2">
                                <code className="flex-1 bg-background border border-border/50 px-4 py-2.5 rounded-lg font-mono text-sm break-all flex items-center text-primary font-bold">
                                    {successData.accessToken}
                                </code>
                                <Button 
                                    size="icon" 
                                    variant="secondary" 
                                    className="h-10 w-10 shrink-0"
                                    onClick={() => copyToClipboard(successData.accessToken, "Erişim anahtarı")}
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 py-4">
                        <ShieldAlert className="h-5 w-5" />
                        <AlertTitle className="font-bold">Önemli Hatırlatma</AlertTitle>
                        <AlertDescription className="text-xs opacity-90">
                            Anonim biletler listenizde gözükmez. Bu bilgileri kaydetmezseniz bildiriminize tekrar erişemezsiniz.
                        </AlertDescription>
                    </Alert>
                </CardContent>

                <CardFooter className="flex flex-col sm:flex-row gap-3 px-6 md:px-10 pb-8">
                    <Button variant="outline" onClick={() => { setSuccessData(null); form.reset(); setFiles([]); }} className="w-full sm:flex-1">
                        Yeni Bildirim
                    </Button>
                    <Button onClick={() => { if (onSubmitSuccess) onSubmitSuccess(); }} className="w-full sm:flex-1">
                        Listeye Dön
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="border-border/50 shadow-lg">
            <CardHeader>
                <CardTitle>Bildirim Oluştur</CardTitle>
                <CardDescription>
                    Sistem hataları veya önerileriniz için formu doldurunuz.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Kategori</Label>
                            <Select 
                                onValueChange={(val) => form.setValue("category", val as any)} 
                                defaultValue={form.getValues("category")}
                            >
                                <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                                <SelectContent>
                                    {TICKET_CATEGORIES.map(cat => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Konu</Label>
                            <Input placeholder="Kısaca özetleyiniz" {...form.register("subject")} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Detaylı Açıklama</Label>
                        <Textarea placeholder="Lütfen detayları buraya yazınız..." className="min-h-[150px] resize-y" {...form.register("message")} />
                    </div>

                    <div className="space-y-2">
                        <Label>Ekler (Opsiyonel)</Label>
                        <div
                            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                            className={cn(
                                "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center gap-4 transition-all duration-300 cursor-pointer relative",
                                dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/20"
                            )}
                        >
                            <input type="file" multiple accept="image/*,.pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <Paperclip className="w-6 h-6 text-muted-foreground" />
                            <p className="text-sm font-medium">Dosyaları buraya sürükleyin veya seçin</p>
                        </div>

                        {files.length > 0 && (
                            <div className="pt-2 space-y-2">
                                {files.map((file, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm p-2 bg-secondary/20 rounded-md border border-border/50">
                                        <div className="flex items-center gap-2 truncate"><FileText className="w-4 h-4 text-muted-foreground shrink-0" /><span>{file.name}</span></div>
                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setFiles(files.filter(f => f !== file))}><X className="w-4 h-4" /></Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-4 pt-4 border-t border-border/50">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center space-x-2">
                                <Switch id="anon-mode" checked={!!isAnonymous} onCheckedChange={(val) => form.setValue("is_anonymous", val)} />
                                <Label htmlFor="anon-mode" className="cursor-pointer font-semibold">Anonim Gönder</Label>
                            </div>
                            {isAnonymous && (
                                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-secondary/30 p-3 rounded-lg border border-border/50 animate-in fade-in slide-in-from-top-1">
                                    <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                                    <p>
                                        Anonim modda bildiriminiz hesabınızla ilişkilendirilmez. Takip etmek için size verilecek olan <strong>Takip ID</strong> ve <strong>Erişim Kodunu</strong> mutlaka kaydetmelisiniz.
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex justify-end">
                            <Button type="submit" disabled={mutation.isPending} className="px-8 w-full sm:w-auto shadow-md">
                                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} Bildirimi Gönder
                            </Button>
                        </div>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}