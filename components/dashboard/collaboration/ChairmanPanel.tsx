"use client";

import { useState } from 'react';
import { Search, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';

interface Member {
  id: string; // UUID
  userId: string; // UUID
  full_name: string;
  email: string;
  role: string;
  can_edit: boolean;
  profile_picture_url?: string | null;
}

interface ChairmanPanelProps {
  isOpen: boolean;
  members: Member[];
  onTogglePermission: (memberId: string, targetUserId: string, currentStatus: boolean) => void;
}

export function ChairmanPanel({ isOpen, members, onTogglePermission }: ChairmanPanelProps) {
  const [searchMember, setSearchMember] = useState("");

  const filteredMembers = (members || []).filter(m =>
    (m.full_name || "").toLowerCase().includes(searchMember.toLowerCase()) ||
    (m.email || "").toLowerCase().includes(searchMember.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "superadmin":
      case "admin":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20"><ShieldAlert className="w-3 h-3" /> Administrator</span>;
      case "committee_chairman":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-500 border border-purple-500/20"><ShieldCheck className="w-3 h-3" /> Chair</span>;
      case "deputy_chair":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"><Shield className="w-3 h-3" /> Deputy chair</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20"><Shield className="w-3 h-3" /> Participant</span>;
    }
  };

  return (
    <div
      className={`fixed right-6 top-[100px] bottom-6 w-[340px] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl flex flex-col transition-transform duration-300 z-50 ${isOpen ? 'translate-x-0' : 'translate-x-[120%]'}`}
    >
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5 rounded-t-xl">
        <h3 className="font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Member permissions
        </h3>
        <span className="text-xs text-muted-foreground">{members?.length || 0} members</span>
      </div>

      <div className="p-3 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            className="pl-9 h-9 bg-background/50 border-white/10"
            value={searchMember}
            onChange={(e) => setSearchMember(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {members?.length === 0 ? "No members yet." : "No members match your search."}
          </div>
        ) : filteredMembers.map(member => (
          <div key={member.id} className="group flex items-center justify-between p-3 rounded-lg bg-card/50 hover:bg-card border border-white/5 hover:border-white/10 transition-all">
            <div className="flex items-center gap-3 overflow-hidden">
              <Avatar className="h-9 w-9 border border-white/10">
                <AvatarImage src={member.profile_picture_url || undefined} className="object-cover" />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {(member.full_name || "??").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{member.full_name}</span>
                <span className="text-xs text-muted-foreground truncate">{member.email}</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <Switch
                checked={member.can_edit}
                onCheckedChange={() => onTogglePermission(member.id, member.userId, member.can_edit)}
                className="scale-75 data-[state=checked]:bg-green-500"
              />
              {getRoleBadge(member.role)}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-white/5 bg-white/5 rounded-b-xl text-[10px] text-center text-muted-foreground">
        Changes apply immediately.
      </div>
    </div>
  );
}

// Change Log:
// - Removed staff badges.
// - Added Co-Chair badge logic.
