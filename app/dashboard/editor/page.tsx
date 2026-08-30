"use client";

import { Suspense, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { Circle, Lock, UserCog, X, History } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

import { EditorToolbar } from '@/components/dashboard/collaboration/EditorToolbar';
import { JoinRoomCard } from '@/components/dashboard/collaboration/JoinRoomCard';
import { ChairmanPanel } from '@/components/dashboard/collaboration/ChairmanPanel';
import { VersionHistorySidebar } from '@/components/dashboard/collaboration/VersionHistorySidebar';
import { ROLES } from '@/lib/roles';

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
];

import { CommitteeInfo, EditorMember as Member } from "@/types/dashboard";

function CollaborativeEditorContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const [hasJoined, setHasJoined] = useState(false);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [status, setStatus] = useState('disconnected');
  // Keep the cursor color stable across renders without using an impure render-time random value.
  const userColor = COLORS[(session?.user?.id?.charCodeAt(0) ?? 0) % COLORS.length];

  const [committeeInfo, setCommitteeInfo] = useState<CommitteeInfo | null>(null);
  const [allCommittees, setAllCommittees] = useState<CommitteeInfo[]>([]);
  const [canWrite, setCanWrite] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [showChairmanPanel, setShowChairmanPanel] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const initData = async () => {
      if (!session?.user) return;

      const role = session.user.role;

      // Site administrators can inspect any committee document in read-only mode.
      if (role === ROLES.SUPERADMIN || role === ROLES.ADMIN) {
        try {
          const res = await fetch('/api/admin/committees');
          if (res.ok) {
            const data = await res.json();
            setAllCommittees(data);
            setCanWrite(false);
            const requestedCommittee = searchParams.get("committeeId");
            const selectedCommittee = data.find((committee: CommitteeInfo) => committee.id === requestedCommittee);
            if (selectedCommittee) setCommitteeInfo(selectedCommittee);
          }
        } catch (e) { console.error(e); }
        return;
      }

      // 2. Chairman & Deputy Chair Logic
      if (role === ROLES.CHAIRMAN || role === ROLES.DEPUTY_CHAIR) {
        try {
          const cRes = await fetch("/api/committee/my-committee");
          if (cRes.ok) {
            const cData = await cRes.json();
            setCommitteeInfo(cData);
            setMembers(cData.members || []);
            setCanWrite(true);
            return;
          }
        } catch (e) { console.error(e); }
      }

      // 3. Delegate / Other Logic
      try {
        const res = await fetch("/api/participant/me");
        const data = await res.json();
        if (data.committee) {
          setCommitteeInfo(data.committee);
          setCanWrite(data.committee.can_write === true);
        }
      } catch (e) { console.error(e); }
    };

    initData();
  }, [searchParams, session]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Placeholder.configure({
        placeholder: 'Start writing together... (You may not have permission to edit)'
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
    editable: hasJoined && !!provider && status === 'connected' && canWrite,
  }, [provider, status, hasJoined, session, canWrite]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(canWrite);
    }
  }, [editor, canWrite]);

  useEffect(() => {
    return () => { provider?.destroy(); };
  }, [provider]);

  const handleJoinRoom = () => {
    if (!session?.user || !committeeInfo) {
      toast.error("Missing information");
      return;
    }

    if (provider) {
      provider.destroy();
      setProvider(null);
    }

    try {
      const doc = new Y.Doc();
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const websocketUrl = `${protocol}://${window.location.hostname}:${process.env.NEXT_PUBLIC_COLLAB_PORT || 1234}`;

      const newProvider = new HocuspocusProvider({
        url: websocketUrl,
        name: `committee-${committeeInfo.id}`,
        document: doc,
        onStatus: (data) => setStatus(data.status),
        onClose: () => setStatus('disconnected'),
        onStateless: ({ payload }) => {
          try {
            const msg = JSON.parse(payload);
            if (msg.type === 'PERMISSION_UPDATE' && msg.userId === session.user.id) {
              setCanWrite(msg.canWrite);
              toast[msg.canWrite ? 'success' : 'warning'](msg.canWrite ? "You can edit this document." : "Your editing permission was removed.");
            }
            if (msg.type === 'client_reload') {
              toast.info("The document was restored. Refreshing the page...");
              setTimeout(() => window.location.reload(), 1000);
            }
          } catch (e) { }
        },
        onAuthenticationFailed: () => {
          toast.error("Unauthorized access");
          setStatus('disconnected');
          setHasJoined(false);
        }
      });

      setProvider(newProvider);
      setHasJoined(true);
    } catch (e) {
      toast.error("Connection error");
    }
  };

  const handleForceRefresh = () => {
    if (provider) {
      provider.sendStateless(JSON.stringify({ type: 'FORCE_REFRESH' }));
    }
  };

  const handleCommitteeSelect = (val: string) => {
    const c = allCommittees.find(x => x.id === val);
    if (c) setCommitteeInfo(c);
  };

  const handleToggleMemberPermission = async (memberId: string, targetUserId: string, currentStatus: boolean) => {
    try {
      await fetch('/api/committee/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, canEdit: !currentStatus })
      });
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, can_edit: !currentStatus } : m));
      if (provider) {
        provider.sendStateless(JSON.stringify({
          type: 'PERMISSION_UPDATE',
          userId: targetUserId,
          canWrite: !currentStatus
        }));
      }
      toast.success("Permission updated");
    } catch (error) { toast.error("Something went wrong"); }
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

  const isChair = session?.user?.role === ROLES.CHAIRMAN || session?.user?.role === ROLES.SUPERADMIN;

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-120px)] animate-fade-in relative overflow-hidden">
      <Breadcrumbs items={[{ label: "Collaborative document" }]} />
      <div className="flex h-full gap-6 relative overflow-hidden">
        <div className={`flex-1 flex flex-col transition-all duration-300 ${showChairmanPanel ? 'mr-[350px]' : ''}`}>
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-4 shrink-0">
            <div>
              <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                Collaborative document
                {session?.user?.role === ROLES.CHAIRMAN && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Manager</span>}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-medium text-muted-foreground">{committeeInfo?.name}</span>
                <div className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${status === 'connected' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                  <Circle className="w-2 h-2 fill-current" /> {status === 'connected' ? 'Live' : 'Disconnected'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(true)}
                className="gap-2"
              >
                <History className="w-4 h-4" />
                History
              </Button>

              {session?.user?.role === ROLES.CHAIRMAN && (
                <Button
                  variant={showChairmanPanel ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowChairmanPanel(!showChairmanPanel)}
                  className="gap-2"
                >
                  <UserCog className="w-4 h-4" />
                  {showChairmanPanel ? "Hide panel" : "Member management"}
                </Button>
              )}
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => window.location.reload()}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <Card className="flex-1 bg-card border-card/50 flex flex-col overflow-hidden relative">
            <EditorToolbar editor={editor} />
            <div className="flex-1 overflow-y-auto">
              <EditorContent editor={editor} className="h-full w-full" />
            </div>
            {!canWrite && (
              <div className="absolute bottom-4 left-4 right-4 bg-destructive/10 text-destructive border border-destructive/20 p-2 rounded text-center text-sm font-medium backdrop-blur-md">
                <Lock className="w-4 h-4 inline mr-2" />
                You do not have permission to edit this document.
              </div>
            )}
          </Card>
        </div>

        {/* Panels */}
        {session?.user?.role === ROLES.CHAIRMAN && (
          <ChairmanPanel
            isOpen={showChairmanPanel}
            members={members.filter(m => m.userId !== session?.user?.id)}
            onTogglePermission={handleToggleMemberPermission}
          />
        )}

        {committeeInfo && (
          <VersionHistorySidebar
            committeeId={committeeInfo.id}
            isOpen={showHistory}
            onClose={() => setShowHistory(false)}
            canManage={isChair}
            onRestoreTrigger={handleForceRefresh}
          />
        )}
      </div>
    </div>
  );
}

export default function CollaborativeEditorPage() {
  return (
    <Suspense fallback={<div className="space-y-4 p-6" aria-label="Loading collaborative document"><div className="h-5 w-48 animate-pulse rounded bg-muted" /><div className="h-12 w-full animate-pulse rounded-xl bg-muted" /><div className="h-[500px] w-full animate-pulse rounded-xl bg-muted" /></div>}>
      <CollaborativeEditorContent />
    </Suspense>
  );
}
