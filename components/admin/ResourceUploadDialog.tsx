"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";

interface ResourceUploadDialogProps {
  onSuccess: () => void;
}

export function ResourceUploadDialog({ onSuccess }: ResourceUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "general",
    is_public: true
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !formData.title) {
      toast.error("Lütfen dosya ve başlık giriniz.");
      return;
    }

    setLoading(true);
    try {
      // 1. Get Authenticated Supabase Token
      const tokenRes = await fetch("/api/auth/supabase-token");
      if (!tokenRes.ok) throw new Error("Authentication failed");
      const { token } = await tokenRes.json();

      // 2. Initialize Client with Token
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: `Bearer ${token}` } }
        }
      );

      // 3. Upload File
      const fileExt = file.name.split('.').pop();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${Date.now()}-${sanitizedName}`;
      const filePath = `${formData.category}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 4. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

      // 5. Save Metadata
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          file_url: publicUrl,
          file_type: fileExt
        })
      });

      if (!res.ok) throw new Error("Metadata save failed");

      toast.success("Dosya başarıyla yüklendi");
      setOpen(false);
      setFile(null);
      setFormData({ title: "", description: "", category: "general", is_public: true });
      onSuccess();

    } catch (error: any) {
      console.error(error);
      toast.error("Yükleme başarısız", { description: error.message || "İzin hatası olabilir." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Dosya Yükle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Yeni Kaynak Ekle</DialogTitle>
          <DialogDescription>
            Sisteme yeni bir dosya yükleyin ve detaylarını belirleyin.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleUpload} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Dosya Seç</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-accent/50 transition-colors relative">
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm font-medium">{file ? file.name : "Dosya sürükleyin veya tıklayın"}</span>
              <span className="text-xs text-muted-foreground">PDF, DOCX, JPG (Max 10MB)</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Başlık</Label>
            <Input 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Dosya adı..."
            />
          </div>

          <div className="space-y-2">
            <Label>Açıklama</Label>
            <Textarea 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="İçerik hakkında kısa bilgi..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select 
                value={formData.category} 
                onValueChange={(val) => setFormData({...formData, category: val})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Genel</SelectItem>
                  <SelectItem value="guide">Çalışma Kılavuzu</SelectItem>
                  <SelectItem value="rules">Prosedür Kuralları</SelectItem>
                  <SelectItem value="schedule">Program</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex flex-col justify-end pb-2">
              <div className="flex items-center justify-between border p-2 rounded-md">
                <Label className="cursor-pointer" htmlFor="public-switch">Herkese Açık</Label>
                <Switch 
                  id="public-switch"
                  checked={formData.is_public}
                  onCheckedChange={(c) => setFormData({...formData, is_public: c})}
                />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Yükle ve Kaydet"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Change Log:
// - Added `<DialogDescription>` to fix accessibility warning.
// - Functionality remains the same.