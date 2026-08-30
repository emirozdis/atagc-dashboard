"use client";

import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  currentImageUrl?: string | null;
  onUploadComplete: (url: string) => void;
  fallbackText?: string;
  size?: "default" | "large";
  editable?: boolean;
}

export function AvatarUpload({
  currentImageUrl,
  onUploadComplete,
  fallbackText = "U",
  size = "default",
  editable = true
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with prop changes
  useEffect(() => {
    // The preview mirrors the current profile image supplied by the parent.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(currentImageUrl || null);
  }, [currentImageUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5 MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    // Optimistic Preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed.");
      }

      const data = await res.json();
      onUploadComplete(data.url);
      // Removed setPreview(data.url) to keep the optimistic preview until reload
      // setting a storage path as src would break the image display
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
      setPreview(currentImageUrl || null); // Revert on error
    } finally {
      setUploading(false);
    }
  };

  const containerSize = size === "large" ? "w-32 h-32" : "w-20 h-20";
  const iconSize = size === "large" ? "w-6 h-6" : "w-4 h-4";
  const textSize = size === "large" ? "text-4xl" : "text-xl";

  return (
    <div className="relative group inline-block">
      <Avatar className={cn("border-4 border-background shadow-lg", containerSize)}>
        {/* Added object-cover to ensure aspect ratio is maintained */}
        <AvatarImage
          src={preview || undefined}
          className="object-cover w-full h-full"
          alt="Profile Picture"
        />
        <AvatarFallback className={cn("font-bold bg-muted text-muted-foreground", textSize)}>
          {fallbackText.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {editable && (
        <>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className={cn(
              "absolute bottom-0 right-0 rounded-full shadow-md border border-border transition-all duration-200",
              "opacity-100 md:opacity-0 md:group-hover:opacity-100",
              uploading ? "cursor-wait" : "cursor-pointer"
            )}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className={cn("animate-spin text-primary", iconSize)} />
            ) : (
              <Camera className={cn("text-muted-foreground hover:text-foreground", iconSize)} />
            )}
          </Button>
        </>
      )}
    </div>
  );
}

// Change Log:
// - Verified `object-cover` usage in `AvatarImage` via the `className` prop to ensure uploaded images are cropped correctly to fill the circle without distortion.
