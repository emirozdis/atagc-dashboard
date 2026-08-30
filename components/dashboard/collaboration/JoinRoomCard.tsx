"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Users, Shield, LogIn } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Committee {
  id: string;
  name: string;
}

interface JoinRoomCardProps {
  userRole?: string;
  allCommittees: Committee[];
  committeeInfo: Committee | null;
  onCommitteeSelect: (id: string) => void;
  onJoin: () => void;
}

export function JoinRoomCard({ userRole, allCommittees, committeeInfo, onCommitteeSelect, onJoin }: JoinRoomCardProps) {
  const canChooseCommittee = userRole === "superadmin" || userRole === "admin";

  return (
    <div className="flex min-h-[calc(100vh-100px)] items-center justify-center px-4 animate-fade-in">
      <Card className="w-full max-w-md border-card/50 bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl font-bold">Collaborative document</CardTitle>
          <CardDescription>Join the committee room to view or edit its document.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {canChooseCommittee ? (
            <div className="space-y-4">
              <Label>Committee selection (read-only)</Label>
              <Select onValueChange={onCommitteeSelect}>
                <SelectTrigger><SelectValue placeholder="Select a committee" /></SelectTrigger>
                <SelectContent>
                  {allCommittees.map((committee) => <SelectItem key={committee.id} value={committee.id}>{committee.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={onJoin} disabled={!committeeInfo}>View document (read-only)</Button>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              {committeeInfo ? (
                <div className="flex items-center justify-center gap-2 rounded border border-white/5 bg-secondary/10 px-4 py-2 font-medium">
                  <Shield className="h-4 w-4 text-primary" />
                  {committeeInfo.name}
                </div>
              ) : <div className="flex w-full justify-center py-2"><Skeleton className="h-8 w-40" /></div>}
              <Button onClick={onJoin} className="w-full" disabled={!committeeInfo}><LogIn className="mr-2 h-4 w-4" />Join room</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
