"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { QrCode, RefreshCcw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Committee {
  id: string; // UUID
  name: string;
}

export default function RollCallPage() {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [selectedCommittee, setSelectedCommittee] = useState<string>("");
  const [sessionName, setSessionName] = useState("");
  const [qrData, setQrData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCommittees = async () => {
      const res = await fetch("/api/admin/committees");
      if (res.ok) {
        const data = await res.json();
        setCommittees(data);
      }
    };
    fetchCommittees();
  }, []);

  const generateQR = async () => {
    if (!selectedCommittee || !sessionName) {
      toast.error("Eksik Bilgi", { description: "Lütfen komite ve oturum adı seçiniz." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/roll-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          committee_id: selectedCommittee,
          session_name: sessionName,
        }),
      });

      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      
      const qrPayload = JSON.stringify({
        sessionId: data.id,
        token: data.qr_code,
        type: "ATAGC_ROLL_CALL"
      });
      
      setQrData(qrPayload);
      toast.success("QR Kod Oluşturuldu");
    } catch (e) {
      toast.error("Hata", { description: "QR Kod oluşturulamadı." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">Yoklama</h2>
        <p className="text-muted-foreground mt-1">
          Oturumlar için yoklama QR kodu oluşturun.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Oturum Bilgileri</CardTitle>
            <CardDescription>QR kod oluşturmak için detayları giriniz.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Komite</Label>
              <Select value={selectedCommittee} onValueChange={setSelectedCommittee}>
                <SelectTrigger>
                  <SelectValue placeholder="Komite Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {committees.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Oturum Adı</Label>
              <Input 
                placeholder="Örn: 1. Oturum, Sabah Oturumu" 
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
              />
            </div>

            <Button onClick={generateQR} className="w-full mt-4" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
              QR Kod Oluştur
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 flex flex-col items-center justify-center p-6 min-h-[300px]">
          {qrData ? (
            <div className="text-center space-y-4 animate-in zoom-in fade-in">
              <div className="bg-white p-4 rounded-xl shadow-lg inline-block">
                 <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}&bgcolor=ffffff`} 
                    alt="Session QR Code" 
                    className="w-48 h-48 md:w-64 md:h-64 object-contain"
                 />
              </div>
              <div>
                <h3 className="font-bold text-lg text-primary">{sessionName}</h3>
                <p className="text-sm text-muted-foreground">
                  {committees.find(c => c.id === selectedCommittee)?.name}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setQrData(null)}>
                <RefreshCcw className="w-3 h-3 mr-2" />
                Yeni Kod
              </Button>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <QrCode className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>QR kod burada görüntülenecektir.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}