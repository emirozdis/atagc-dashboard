"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AdminPaymentUploadDialogProps {
  userId: string;
  userFullName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AdminPaymentUploadDialog({ userId, userFullName, open, onOpenChange, onSuccess }: AdminPaymentUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (uploadFile: File) => {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("userId", userId);

      const res = await fetch("/api/admin/payments/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed.");
      }
    },
    onSuccess: () => {
      toast.success("Receipt uploaded successfully", { description: `Payment for ${userFullName} is now under review.` });
      onSuccess();
      onOpenChange(false);
      setFile(null);
    },
    onError: (error) => toast.error("Upload failed", { description: error instanceof Error ? error.message : "Please try again." }),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload receipt</DialogTitle>
          <DialogDescription>
            Upload a payment receipt for <strong>{userFullName}</strong>. The payment status will be updated to “Under review.”
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {file ? (
            <div className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm p-4 flex items-center justify-between gap-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-6 h-6 text-primary shrink-0" />
                <div className="min-w-0">
                  <h4 className="font-medium text-sm truncate">{file.name}</h4>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setFile(null)} disabled={uploadMutation.isPending} className="text-muted-foreground hover:text-destructive shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div
              className={cn("border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center gap-4 transition-all duration-300 cursor-pointer relative", dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/20")}
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            >
              <input type="file" accept="image/jpeg,image/png,application/pdf,image/jpg" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={uploadMutation.isPending} />
              <div className="p-3 bg-background rounded-full border border-border"><UploadCloud className={cn("w-6 h-6", dragActive ? "text-primary" : "text-muted-foreground")} /></div>
              <div className="space-y-1"><p className="text-sm font-semibold">Drag a file here or click to browse</p><p className="text-xs text-muted-foreground">PDF, JPG, or PNG (max 5 MB)</p></div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploadMutation.isPending}>Cancel</Button>
          <Button onClick={() => file && uploadMutation.mutate(file)} disabled={!file || uploadMutation.isPending}>
            {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload for review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// Change log:
// - Created new dialog component for admins to upload payment receipts for a user.
// - Includes file selection, drag-and-drop area, and mutation logic to call the new API endpoint.
