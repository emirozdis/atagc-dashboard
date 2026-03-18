"use client";

import { useQuery } from "@tanstack/react-query";
import { Camera, X, ChevronLeft, ChevronRight, Upload, ImageOff, MapPin, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { useSession } from "next-auth/react";
import { useState, useCallback } from "react";
import Link from "next/link";
import type { PhotoArea, PressPhoto } from "@/types/gallery";

const PRESS_ROLES = ["head_press", "press"];

async function downloadPhoto(url: string, filename: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export default function GalleryPage() {
  const { data: session } = useSession();
  const [selectedAreaId, setSelectedAreaId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const limit = 24;

  const userRole = session?.user?.role;
  const isPressUser = userRole && PRESS_ROLES.includes(userRole);

  // Check gallery status
  const { data: status, isLoading: statusLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ["gallery-status"],
    queryFn: async () => {
      const res = await fetch("/api/gallery/status");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // Fetch areas for filter
  const { data: areas } = useQuery<PhotoArea[]>({
    queryKey: ["gallery-areas"],
    queryFn: async () => {
      const res = await fetch("/api/gallery/areas");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: status?.enabled === true,
  });

  // Fetch photos
  const { data: photosData, isLoading: photosLoading } = useQuery<{
    photos: PressPhoto[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: ["gallery-photos", selectedAreaId, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (selectedAreaId !== "all") params.set("area_id", selectedAreaId);
      const res = await fetch(`/api/gallery?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: status?.enabled === true,
  });

  const photos = photosData?.photos || [];
  const totalPages = Math.ceil((photosData?.total || 0) / limit);

  const openLightbox = useCallback((index: number) => setLightboxIndex(index), []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const goNext = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : prev));
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
  }, []);

  if (statusLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  // Gallery disabled
  if (!status?.enabled) {
    return (
      <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
        <Breadcrumbs items={[{ label: "Galeri" }]} />
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
          <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center mb-4">
            <Camera className="w-8 h-8 text-pink-500" />
          </div>
          <h2 className="text-xl font-bold">Galeri Kapalı</h2>
          <p className="text-muted-foreground mt-2">
            Fotoğraf galerisi henüz aktif edilmemiş. Lütfen daha sonra tekrar kontrol edin.
          </p>
        </div>
      </div>
    );
  }

  const currentPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      <Breadcrumbs items={[{ label: "Galeri" }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Fotoğraf Galerisi</h2>
          <p className="text-muted-foreground mt-1">Etkinlik fotoğrafları</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Area filter */}
          <Select value={selectedAreaId} onValueChange={(v) => { setSelectedAreaId(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Alan Filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Alanlar</SelectItem>
              {areas?.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isPressUser && (
            <Button asChild>
              <Link href="/organisation/press/upload">
                <Upload className="w-4 h-4 mr-2" />
                Fotoğraf Yükle
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Photo grid */}
      {photosLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
          <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
            <ImageOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Henüz fotoğraf yok</h3>
          <p className="text-muted-foreground mt-1">Bu alanda henüz fotoğraf yüklenmemiş.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => openLightbox(index)}
                className="group relative aspect-square rounded-xl overflow-hidden border border-border/40 bg-muted/10 hover:border-primary/30 hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.signed_url || ""}
                  alt="Etkinlik fotoğrafı"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (photo.signed_url) downloadPhoto(photo.signed_url, `photo-${photo.id}.${photo.file_type || "jpg"}`);
                  }}
                  className="absolute top-2 right-2 z-10 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Download className="w-5 h-5" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {photo.area && (
                    <Badge variant="secondary" className="text-xs bg-black/50 text-white border-0 mb-1">
                      <MapPin className="w-3 h-3 mr-1" />
                      {photo.area.name}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxIndex !== null} onOpenChange={(open) => !open && closeLightbox()}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0 overflow-hidden [&>button]:hidden">
          {currentPhoto && (
            <div className="relative flex flex-col items-center justify-center w-full h-[90vh]">
              {/* Close button */}
              <button
                onClick={closeLightbox}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Navigation */}
              {lightboxIndex !== null && lightboxIndex > 0 && (
                <button
                  onClick={goPrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              {lightboxIndex !== null && lightboxIndex < photos.length - 1 && (
                <button
                  onClick={goNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              {/* Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentPhoto.signed_url || ""}
                alt="Etkinlik fotoğrafı"
                className="max-w-full max-h-[80vh] object-contain"
              />

              {/* Info bar */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center gap-3 flex-wrap">
                  {currentPhoto.area && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                      <MapPin className="w-3 h-3 mr-1" />
                      {currentPhoto.area.name}
                    </Badge>
                  )}
                  <button
                    onClick={() => {
                      if (currentPhoto.signed_url) downloadPhoto(currentPhoto.signed_url, `photo-${currentPhoto.id}.${currentPhoto.file_type || "jpg"}`);
                    }}
                    className="mx-auto p-3 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                  >
                    <Download className="w-7 h-7" />
                  </button>
                  <span className="text-white/60 text-xs ml-auto">
                    {new Date(currentPhoto.created_at).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
