"use client";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Camera } from "lucide-react";

export default function PressGalleryPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      <Breadcrumbs items={[{ label: "Organizasyon", href: "/organisation" }, { label: "Basın Galerisi" }]} />
      
      <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
        <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center mb-4">
            <Camera className="w-8 h-8 text-pink-500" />
        </div>
        <h2 className="text-xl font-bold">Basın Galerisi</h2>
        <p className="text-muted-foreground mt-2">Fotoğraf ve medya yönetimi yakında eklenecek.</p>
      </div>
    </div>
  );
}