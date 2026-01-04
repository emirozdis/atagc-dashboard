"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, UploadCloud, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";
import { Committee } from "@/types/admin";
import { useSession } from "next-auth/react";

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
    is_public: true,
    committee_id: "null", // Use 'null' as string for empty state
  });

  const [committees, setCommittees] = useState<Committee[]>([]);
  const { data: session } = useSession();
  const [chairmanCommittee, setChairmanCommittee] = useState<Committee | null>(null);

  const isChairman = session?.user?.role === "committee_chairman";
  const isAdmin = session?.user?.role === "superadmin" || session?.user?.role === "admin";

  useEffect(() => {
    const fetchAdminData = async () => {
      if (open && isAdmin) {
        try {
          const res = await fetch("/api/admin/committees");
          if (res.ok) setCommittees(await res.json());
        } catch (e) {
          console.error("Failed to fetch committees", e);
        }
      }
    };
    fetchAdminData();
  }, [open, isAdmin]);

  useEffect(() => {
    const fetchChairmanData = async () => {
      if (open && isChairman) {
        try {
          const res = await fetch("/api/committee/my-committee");
          if (res.ok) {
            const data = await res.json();
            setChairmanCommittee(data);
            setFormData(prev => ({ ...prev, is_public: false, committee_id: data.id }));
          }
        } catch (e) {
          console.error("Failed to fetch chairman's committee", e);
        }
      }
    };
    fetchChairmanData();
  }, [open, isChairman]);

  const resetForm = () => {
    setFile(null);
    setFormData({
      title: "",
      description: "",
      category: "general",
      is_public: true,
      committee_id: "null",
    });
    setChairmanCommittee(null);
  };

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
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );

      // 3. Upload File
      const fileExt = file.name.split('.').pop();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${Date.now()}-${sanitizedName}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      // 4. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

      // 5. Prepare and Save Metadata
      const payload: any = {
        ...formData,
        file_url: publicUrl,
        file_type: fileExt,
      };

      if (isChairman && chairmanCommittee) {
        payload.committee_id = chairmanCommittee.id;
        payload.is_public = false; // Enforce private for chairmen
      } else {
        payload.committee_id = formData.committee_id === 'null' ? null : formData.committee_id;
      }
      
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Metadata save failed");
      }

      toast.success("Dosya başarıyla yüklendi");
      setOpen(false);
      resetForm();
      onSuccess();

    } catch (error: any) {
      console.error(error);
      toast.error("Yükleme başarısız", { description: error.message || "İzin hatası olabilir." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
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

          {isAdmin && (
            <div className="space-y-2">
              <Label>Komite (Opsiyonel)</Label>
              <Select 
                value={formData.committee_id}
                onValueChange={(val) => setFormData({...formData, committee_id: val})}
              >
                <SelectTrigger><SelectValue placeholder="Komite seçin veya genel bırakın" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">-- Genel Kaynak --</SelectItem>
                  {committees.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isChairman && chairmanCommittee && (
            <div className="space-y-2">
                <Label>Komite</Label>
                <div className="flex items-center gap-2 text-sm font-medium p-3 bg-secondary/20 rounded-md border border-border/50">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span>{chairmanCommittee.name}</span>
                </div>
            </div>
          )}

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
            
            {isAdmin && (
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
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Yükle ve Kaydet"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Change log:
// - Added `useSession` to detect user role (`admin` vs. `committee_chairman`).
// - If the user is a chairman, it automatically fetches their committee and hides the selection dropdown, showing a static display of their committee name.
// - The "Public" switch is now only shown to admins. For chairmen, uploads are defaulted and enforced to be private to their committee.
// - The form submission logic was updated to correctly handle the payload for both roles.