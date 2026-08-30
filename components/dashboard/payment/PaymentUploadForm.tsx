// components/dashboard/payment/PaymentUploadForm.tsx

"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2, X, FileText, CheckCircle, Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function PaymentUploadForm() {
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const handleFileSelection = (selectedFile: File) => {
        setFile(selectedFile);
        
        if (selectedFile.type.startsWith('image/')) {
            const url = URL.createObjectURL(selectedFile);
            setPreviewUrl(url);
        } else {
            setPreviewUrl(null);
        }
    };

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
            toast.success("Receipt uploaded successfully", { description: "An administrator will review it shortly." });
            queryClient.invalidateQueries({ queryKey: ['payment-status'] });
            queryClient.invalidateQueries({ queryKey: ['payment-status-dashboard'] });
            setFile(null);
            setPreviewUrl(null);
        },
        onError: (error: unknown) => toast.error("Upload failed", { description: error instanceof Error ? error.message : "An unexpected error occurred" })
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelection(e.target.files[0]);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    };

    const removeFile = () => {
        setFile(null);
        setPreviewUrl(null);
    };

    if (file) {
        return (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    {previewUrl ? (
                        <div className="h-48 w-full bg-zinc-950/5 relative flex items-center justify-center overflow-hidden border-b border-border/50">
                            <img src={previewUrl} alt="Preview" className="h-full w-full object-contain p-2" />
                        </div>
                    ) : (
                        <div className="h-24 w-full bg-secondary/20 flex items-center justify-center border-b border-border/50">
                            <FileText className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                    )}

                    <div className="p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <h4 className="font-medium text-sm truncate text-foreground">{file.name}</h4>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={removeFile}
                            disabled={uploadMutation.isPending}
                            className="text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button 
                        variant="outline" 
                        onClick={removeFile}
                        disabled={uploadMutation.isPending}
                        className="flex-1 cursor-pointer"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={() => uploadMutation.mutate(file)}
                        disabled={uploadMutation.isPending}
                        className="flex-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-colors hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                        {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" /> Submit for review</>}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div 
            className={cn(
                "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center gap-4 transition-colors duration-300 cursor-pointer relative overflow-hidden group",
                dragActive 
                    ? "border-primary bg-primary/5 ring-4 ring-primary/10" 
                    : "border-border bg-secondary/20 hover:border-primary/50 hover:bg-card"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <input 
                type="file" 
                accept="image/jpeg,image/png,application/pdf,image/jpg"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                disabled={uploadMutation.isPending}
            />
            
            <div className="p-4 bg-background shadow-sm rounded-full transition-all duration-300 border border-border group-hover:shadow-md group-hover:scale-110">
                <UploadCloud className={cn("w-8 h-8 transition-colors duration-300", dragActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
            </div>
            
            <div className="space-y-1 pointer-events-none">
                <p className="text-base font-semibold text-foreground">Drag your file here</p>
                <p className="text-sm text-muted-foreground">or click to choose it from your computer</p>
            </div>

            <div className="flex gap-2 justify-center pt-2">
                <span className="px-2 py-1 rounded bg-secondary/50 text-[10px] text-muted-foreground font-medium border border-border">JPG</span>
                <span className="px-2 py-1 rounded bg-secondary/50 text-[10px] text-muted-foreground font-medium border border-border">PNG</span>
                <span className="px-2 py-1 rounded bg-secondary/50 text-[10px] text-muted-foreground font-medium border border-border">PDF</span>
            </div>
        </div>
    );
}
