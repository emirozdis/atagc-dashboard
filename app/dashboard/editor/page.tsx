"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { Circle, Lock, UserCog, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { EditorToolbar } from '@/components/app/dashboard/collaboration/EditorToolbar';
import { JoinRoomCard } from '@/components/app/dashboard/collaboration/JoinRoomCard';
import { ChairmanPanel } from '@/components/app/dashboard/collaboration/ChairmanPanel';

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
];

interface CommitteeInfo {
  id: string; // UUID
  name: string;
}

interface Member {
  id: string; // UUID
  userId: string; // UUID
  full_name: string;
  email: string;
  role: string;
  can_edit: boolean;
}

export default function CollaborativeEditorPage() {
  const { data: session } = useSession();

  const [hasJoined, setHasJoined] = useState(false);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [status, setStatus] = useState('disconnected');
  const [userColor] = useState(COLORS[Math.floor(Math.random() * COLORS.length)]);

  const [committeeInfo, setCommitteeInfo] = useState<CommitteeInfo | null>(null);
  const [allCommittees, setAllCommittees] = useState<CommitteeInfo[]>([]);
  const [canWrite, setCanWrite] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [showChairmanPanel, setShowChairmanPanel] = useState(false);

  useEffect(() => {
    const initData = async () => {
      if (!session?.user) return;

      // 1. Superadmin Logic
      if (session.user.role === 'superadmin') {
        try {
          const res = await fetch('/api/admin/committees');
          if (res.ok) {
            const data = await res.json();
            setAllCommittees(data);
            setCanWrite(false);
          }
        } catch (e) {
          console.error("Failed to fetch committees", e);
        }
        return;
      }

      // 2. Chairman Logic (Prioritized)
      if (session.user.role === 'committee_chairman') {
        try {
          const cRes = await fetch("/api/committee/my-committee");
          if (cRes.ok) {
            const cData = await cRes.json();
            setCommitteeInfo(cData);
            setMembers(cData.members || []);
            setCanWrite(true);
            return;
          }
        } catch (e) {
          console.error("Chairman fetch failed", e);
        }
      }

      // 3. Participant Logic (Fallback)
      try {
        const res = await fetch("/api/participant/me");
        const data = await res.json();

        if (data.committeeMember?.committee) {
          setCommitteeInfo(data.committeeMember.committee);
          const dbCanWrite = data.committeeMember.can_write;
          setCanWrite(dbCanWrite === true);
        }
      } catch (e) {
        console.error(e);
      }
    };

    initData();
  }, [session]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Placeholder.configure({
        placeholder: 'Birlikte yazmaya başlayın... (Eğer yazamıyorsanız yetkiniz kısıtlanmış olabilir)'
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ...(provider ? [
        Collaboration.configure({ document: provider.document }),
        CollaborationCursor.configure({
          provider: provider,
          user: { name: session?.user?.name || 'Anonim', color: userColor },
        }),
      ] : []),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-lg max-w-none focus:outline-none min-h-[500px] p-8 text-foreground',
      },
    },
    editable: hasJoined && !!provider && status === 'connected',
  }, [provider, status, hasJoined, session]);

  useEffect(() => {
    if (editor && editor.isEditable !== canWrite) {
      editor.setEditable(canWrite);
    }
  }, [editor, canWrite]);

  useEffect(() => {
    return () => { provider?.destroy(); };
  }, [provider]);

  const handleJoinRoom = () => {
    if (!session?.user || !committeeInfo) {
      toast.error("Eksik Bilgi", { description: "Komite bilgisi bulunamadı." });
      return;
    }

    if (provider) {
      provider.destroy();
      setProvider(null);
    }

    try {
      const doc = new Y.Doc();
      
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const websocketUrl = `${protocol}://${window.location.hostname}:1234`;

      const newProvider = new HocuspocusProvider({
        url: websocketUrl,
        name: `committee-${committeeInfo.id}`,
        document: doc,
        onStatus: (data) => {
          setStatus(data.status);
          if (data.status === 'connected') toast.success("Bağlantı Kuruldu");
        },
        onClose: () => setStatus('disconnected'),
        onStateless: ({ payload }) => {
          try {
            const msg = JSON.parse(payload);
            if (msg.type === 'PERMISSION_UPDATE' && msg.userId == session.user.id) {
              setCanWrite(msg.canWrite);
              if (msg.canWrite) {
                toast.success("Yazma izniniz açıldı.");
              } else {
                toast.warning("Yazma izniniz kısıtlandı.");
              }
            }
          } catch (e) {
            console.error("Invalid stateless message", e);
          }
        },
        onAuthenticationFailed: () => {
          toast.error("Yetkisiz Erişim", { description: "Erişim reddedildi." });
          setStatus('disconnected');
          setHasJoined(false);
        }
      });

      setProvider(newProvider);
      setHasJoined(true);
    } catch (e) {
      toast.error("Bağlantı Hatası");
    }
  };

  const handleCommitteeSelect = (val: string) => {
    const c = allCommittees.find(x => x.id === val);
    if (c) setCommitteeInfo(c);
  };

  const handleToggleMemberPermission = async (memberId: string, targetUserId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/committee/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, canEdit: !currentStatus })
      });
      if (!res.ok) throw new Error("Failed");

      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, can_edit: !currentStatus } : m));

      if (provider) {
        const payload = JSON.stringify({
          type: 'PERMISSION_UPDATE',
          userId: targetUserId,
          canWrite: !currentStatus
        });
        provider.sendStateless(payload);
      }

      toast.success("Yetki Güncellendi");
    } catch (error) {
      toast.error("Hata oluştu");
    }
  };


  if (!hasJoined) {
    return (
      <JoinRoomCard
        userRole={session?.user?.role}
        allCommittees={allCommittees}
        committeeInfo={committeeInfo}
        onCommitteeSelect={handleCommitteeSelect}
        onJoin={handleJoinRoom}
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 animate-fade-in relative overflow-hidden">
      <div className={`flex-1 flex flex-col transition-all duration-300 ${showChairmanPanel ? 'mr-[350px]' : ''}`}>
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-4 shrink-0">
          <div>
            <h2 className="text-2xl font-display font-bold flex items-center gap-2">
              Ortak Çalışma
              {session?.user?.role === 'committee_chairman' && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Yönetici</span>
              )}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm font-medium text-muted-foreground">{committeeInfo?.name}</span>
              <div className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${status === 'connected' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                <Circle className="w-2 h-2 fill-current" /> {status === 'connected' ? 'Canlı' : 'Bağlantı Koptu'}
              </div>
              {(!editor?.isEditable || !canWrite) && (
                <div className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                  <Lock className="w-3 h-3" /> Salt Okunur
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session?.user?.role === 'committee_chairman' && (
              <Button
                variant={showChairmanPanel ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowChairmanPanel(!showChairmanPanel)}
                className="gap-2"
              >
                <UserCog className="w-4 h-4" />
                {showChairmanPanel ? "Paneli Gizle" : "Üye Yönetimi"}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => window.location.reload()}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <Card className="flex-1 bg-card/30 border-white/5 flex flex-col overflow-hidden shadow-xl backdrop-blur-sm relative">
          <EditorToolbar editor={editor} />
          <div className="flex-1 overflow-y-auto">
            <EditorContent editor={editor} className="h-full w-full" />
          </div>

          {!canWrite && (
            <div className="absolute bottom-4 left-4 right-4 bg-destructive/10 text-destructive border border-destructive/20 p-2 rounded text-center text-sm font-medium backdrop-blur-md animate-in slide-in-from-bottom-2">
              <Lock className="w-4 h-4 inline mr-2" />
              Yazma izniniz bulunmamaktadır. Yalnızca görüntüleyebilirsiniz.
            </div>
          )}
        </Card>
      </div>

      {session?.user?.role === 'committee_chairman' && (
        <ChairmanPanel
          isOpen={showChairmanPanel}
          // Filter out the current user (chairman) from the members list
          members={members.filter(m => m.userId !== session?.user?.id)}
          onTogglePermission={handleToggleMemberPermission}
        />
      )}
    </div>
  );
}