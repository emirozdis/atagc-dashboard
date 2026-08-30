"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock, UploadCloud, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

export function PaymentStatusCard() {
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['payment-status'],
        queryFn: async () => {
            const res = await fetch("/api/payment/status");
            if (!res.ok) throw new Error("Failed");
            return res.json();
        }
    });

    const uploadMutation = useMutation({
        mutationFn: async (uploadFile: File) => {
            const formData = new FormData();
            formData.append("file", uploadFile);

            const res = await fetch("/api/payment/upload", {
                method: "POST",
                body: formData
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Upload failed");
            }
        },
        onSuccess: () => {
            toast.success("Receipt uploaded");
            queryClient.invalidateQueries({ queryKey: ['payment-status'] });
            setFile(null);
        },
        onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "An unexpected error occurred")
    });

    if (isLoading) {
        return (
            <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/5 border-b border-border/50 pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="w-5 h-5 text-primary" />
                        Payment status
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-md" />
                </CardContent>
            </Card>
        );
    }

    const status = data?.payment_status || 'unpaid';
    const lastReceipt = data?.last_receipt;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    if (status === 'paid') {
        return (
            <Card className="bg-emerald-500/10 border-emerald-500/20 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center gap-3">
                    <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-600">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">Payment approved</h3>
                        <p className="text-emerald-600/80 text-sm mt-1">Your registration is complete. Thank you.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (status === 'processing') {
        return (
            <Card className="bg-amber-500/5 border-amber-500/20 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center gap-3">
                    <div className="p-3 bg-amber-500/20 rounded-full text-amber-600 animate-pulse">
                        <Clock className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-amber-700 dark:text-amber-400">Under review</h3>
                        <p className="text-amber-600/80 text-sm mt-1">Your payment is awaiting administrator review.</p>
                        <p className="text-xs text-muted-foreground mt-2">Uploaded: {new Date(lastReceipt?.created_at).toLocaleDateString("en-GB")}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/5 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-primary" />
                    Payment status
                </CardTitle>
                <CardDescription>Pay the participation fee and upload your receipt.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">

                {status === 'rejected' && lastReceipt?.admin_note && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-start gap-3 text-sm text-red-600">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold block mb-1">Payment rejected</span>
                            {lastReceipt.admin_note}
                        </div>
                    </div>
                )}

                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 flex flex-col items-center justify-center text-center gap-4 transition-colors hover:bg-muted/5 group relative">
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={uploadMutation.isPending}
                    />
                    <div className="p-3 bg-secondary rounded-full group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium">{file ? file.name : "Upload receipt"}</p>
                        <p className="text-xs text-muted-foreground">PDF, JPG veya PNG (Max 5MB)</p>
                    </div>
                </div>

                {file && (
                    <Button
                        className="w-full"
                        onClick={() => uploadMutation.mutate(file)}
                        disabled={uploadMutation.isPending}
                    >
                        {uploadMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Submit"}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
