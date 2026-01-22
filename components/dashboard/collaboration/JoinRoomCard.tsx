"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users, Shield, LogIn } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Committee {
  id: string; // UUID
  name: string;
}

interface JoinRoomCardProps {
  userRole?: string;
  allCommittees: Committee[];
  committeeInfo: Committee | null;
  onCommitteeSelect: (id: string) => void;
  onJoin: () => void;
}

export function JoinRoomCard({
  userRole,
  allCommittees,
  committeeInfo,
  onCommitteeSelect,
  onJoin
}: JoinRoomCardProps) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-100px)] animate-fade-in px-4">
      <Card className="w-full max-w-md bg-card border-card/50 ">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display font-bold">Ortak Çalışma</CardTitle>
          <CardDescription>Belge düzenlemek için odaya katılın.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {userRole === 'superadmin' ? (
            <div className="space-y-4">
              <Label>Komite Seçimi (Yönetici)</Label>
              <Select onValueChange={onCommitteeSelect}>
                <SelectTrigger><SelectValue placeholder="Komite seçiniz" /></SelectTrigger>
                <SelectContent>
                  {allCommittees.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={onJoin} disabled={!committeeInfo}>
                Görüntüle (Salt Okunur)
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              {committeeInfo ? (
                <div className="bg-secondary/10 px-4 py-2 rounded border border-white/5 font-medium flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  {committeeInfo.name}
                </div>
              ) : <div className="w-full flex justify-center py-2"><Skeleton className="h-8 w-40" /></div>}

              <Button onClick={onJoin} className="w-full" disabled={!committeeInfo}>
                <LogIn className="w-4 h-4 mr-2" /> Odaya Katıl
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}