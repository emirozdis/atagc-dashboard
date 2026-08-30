"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Camera, Upload, ImagePlus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { toast } from "sonner";
import type { PhotoArea } from "@/types/gallery";

export default function PressUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [areaId, setAreaId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: areas, isLoading: areasLoading } = useQuery<PhotoArea[]>({
    queryKey: ["gallery-areas-upload"],
    queryFn: async () => {
      const res = await fetch("/api/gallery/areas");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Only JPG, PNG, and WEBP files are supported.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size cannot exceed 10 MB.");
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileChange(droppedFile);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !areaId) {
      toast.error("Please select a file and area.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("area_id", areaId);
      const res = await fetch("/api/gallery/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || "Upload failed.");
      }

      toast.success("Photo uploaded successfully!");
      clearFile();
      setAreaId("");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setUploading(false);
    }
  };

  if (areasLoading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto pb-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto pb-12">
      <Breadcrumbs
        items={[
          { label: "Organisation", href: "/organisation" },
          { label: "Upload photo" },
        ]}
      />

      <div>
        <h2 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Camera className="w-8 h-8 text-pink-500" />
          Upload photo
        </h2>
        <p className="text-muted-foreground mt-1">Upload conference photos to the gallery.</p>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/5 border-b border-border/50">
          <CardTitle>New photo</CardTitle>
          <CardDescription>JPG, PNG, or WEBP, up to 10 MB.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File drop zone */}
            <div className="space-y-2">
              <Label>Photo</Label>
              {!preview ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/5 transition-colors"
                >
                  <ImagePlus className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium">Drag a file here or click to choose</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP - Max 10MB</p>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-border/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Preview" className="w-full max-h-[300px] object-contain bg-muted/10" />
                  <button
                    type="button"
                    onClick={clearFile}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
            </div>

            {/* Area select */}
            <div className="space-y-2">
              <Label>Alan</Label>
              <Select value={areaId} onValueChange={setAreaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the area where the photo was taken" />
                </SelectTrigger>
                <SelectContent>
                  {areas?.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={uploading || !file || !areaId} className="w-full">
              {uploading ? (
                <>
                  <span className="animate-spin mr-2">
                    <Upload className="w-4 h-4" />
                  </span>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
