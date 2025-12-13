"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, List, ListOrdered, Quote,
  Users, Circle, WifiOff, LogIn, Lock, Settings2, Shield, X, Check, Search, UserCog
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
];

// --- Toolbar Component ---
const ToolbarButton = ({ onClick, isActive, disabled, children, title }: any) => (
  <Button 
    variant="ghost" 
    size="icon" 
    onClick={onClick} 
    disabled={disabled} 
    title={title} 
    className={`h-8 w-8 transition-all ${isActive ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-white/5'}`}
  >
    {children}
  </Button>
);

const EditorToolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;
  return (
    <div className="border-b border-white/10 p-2 flex flex-wrap gap-1 bg-muted/20 sticky top-0 z-10 backdrop-blur-sm">
      <div className="flex items-center space-x-1 border-r border-white/10 pr-2 mr-2">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}><Bold className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}><Italic className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')}><UnderlineIcon className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')}><Strikethrough className="w-4 h-4" /></ToolbarButton>
      </div>
      <div className="flex items-center space-x-1 border-r border-white/10 pr-2 mr-2">
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })}><AlignLeft className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })}><AlignCenter className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })}><AlignRight className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })}><AlignJustify className="w-4 h-4" /></ToolbarButton>
      </div>
      <div className="flex items-center space-x-1">
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })}><Heading1 className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')}><List className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')}><ListOrdered className="w-4 h-4" /></ToolbarButton>
      </div>
    </div>
  );
};

export default function CollaborativeEditorPage() {
  const { data: session } = useSession();
  const [hasJoined, setHasJoined] = useState(false);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [status, setStatus] = useState('disconnected');
  const [userColor] = useState(COLORS[Math.floor(Math.random() * COLORS.length)]);
  
  // Data State
  const [committeeInfo, setCommitteeInfo] = useState<{ id: number; name: string } | null>(null);
  const [allCommittees, setAllCommittees] = useState<{ id: number; name: string }[]>([]);
  
  const [canWrite, setCanWrite] = useState(false); 
  
  // Chairman Controls
  const [members, setMembers] = useState<{id: number, userId: number, full_name: string, email: string, can_edit: boolean}[]>([]);
  const [showChairmanPanel, setShowChairmanPanel] = useState(false);
  const [searchMember, setSearchMember] = useState("");

  useEffect(() => {
    const initData = async () => {
        if (!session?.user) return;

        if (session.user.role === 'superadmin') {
            try {
                const res = await fetch('/api/admin/committees');
                if(res.ok) {
                    const data = await res.json();
                    setAllCommittees(data);
                    setCanWrite(false);
                }
            } catch (e) {
                console.error("Failed to fetch committees", e);
            }
        } 
        else {
            try {
                const res = await fetch("/api/participant/me");
                const data = await res.json();
                
                if (data.committeeMember?.committee) {
                    setCommitteeInfo(data.committeeMember.committee);
                    const dbCanWrite = data.committeeMember.can_write;
                    setCanWrite(dbCanWrite === true);
                } 
                else if (session.user.role === 'committee_chairman') {
                    const cRes = await fetch("/api/committee/my-committee");
                    if(cRes.ok) {
                        const cData = await cRes.json();
                        setCommitteeInfo(cData);
                        setMembers(cData.members || []);
                        setCanWrite(true);
                    }
                }
            } catch (e) {
                console.error(e);
            }
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
    // IMPORTANT: Dependencies here determine when the editor is re-created. 
    // We removed 'canWrite' from here to prevent re-creation on permission change.
    // Instead, we use useEffect to update editable state.
    editable: hasJoined && !!provider && status === 'connected', 
  }, [provider, status, hasJoined, session]);

  // Handle Dynamic Permission Changes
  useEffect(() => {
    if (editor && editor.isEditable !== canWrite) {
      editor.setEditable(canWrite);
    }
  }, [editor, canWrite]);

  useEffect(() => {
    return () => { provider?.destroy(); };
  }, [provider]);

  const handleJoinRoom = (targetCommitteeId?: number) => {
    const target = targetCommitteeId ? { id: targetCommitteeId, name: "Seçili Komite" } : committeeInfo;

    if (!session?.user || !target) {
      toast.error("Eksik Bilgi", { description: "Komite bilgisi bulunamadı." });
      return;
    }

    if(provider) {
        provider.destroy();
        setProvider(null);
    }

    try {
      const doc = new Y.Doc();
      const newProvider = new HocuspocusProvider({
        url: `ws://${window.location.hostname}:1234`, 
        name: `committee-${target.id}`,
        document: doc,
        onStatus: (data) => {
            setStatus(data.status);
            if(data.status === 'connected') toast.success("Bağlantı Kuruldu");
        },
        onClose: () => setStatus('disconnected'),
        onAwarenessUpdate: ({ states }) => setUserCount(states.length),
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

  const handleToggleMemberPermission = async (memberId: number, targetUserId: number, currentStatus: boolean) => {
    try {
        // 1. Update Database
        const res = await fetch('/api/committee/members', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ memberId, canEdit: !currentStatus })
        });
        if(!res.ok) throw new Error("Failed");
        
        // 2. Update Local State
        setMembers(prev => prev.map(m => m.id === memberId ? {...m, can_edit: !currentStatus} : m));
        
        // 3. Send WebSocket Message for Instant Update
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

  const filteredMembers = members.filter(m => 
    m.full_name.toLowerCase().includes(searchMember.toLowerCase()) ||
    m.email.toLowerCase().includes(searchMember.toLowerCase())
  );

  // --- RENDER ---

  if (!hasJoined) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)] animate-fade-in px-4">
        <Card className="w-full max-w-md bg-card/50 border-white/5 shadow-2xl backdrop-blur-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-display font-bold">Ortak Çalışma</CardTitle>
            <CardDescription>Belge düzenlemek için odaya katılın.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             {session?.user?.role === 'superadmin' ? (
                 <div className="space-y-4">
                     <Label>Komite Seçimi (Yönetici)</Label>
                     <Select onValueChange={(val) => {
                         const c = allCommittees.find(x => x.id === parseInt(val));
                         if(c) setCommitteeInfo(c);
                     }}>
                        <SelectTrigger><SelectValue placeholder="Komite seçiniz" /></SelectTrigger>
                        <SelectContent>
                            {allCommittees.map(c => (
                                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                     </Select>
                     <Button className="w-full" onClick={() => handleJoinRoom(committeeInfo?.id)} disabled={!committeeInfo}>
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
                    ) : <div className="text-destructive text-sm">Komite ataması bulunamadı.</div>}
                    
                    <Button onClick={() => handleJoinRoom()} className="w-full" disabled={!committeeInfo}>
                        <LogIn className="w-4 h-4 mr-2" /> Odaya Katıl
                    </Button>
                 </div>
             )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 animate-fade-in relative overflow-hidden">
      
      {/* MAIN EDITOR AREA */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${showChairmanPanel ? 'mr-[350px]' : ''}`}>
        
        {/* Header Bar */}
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

        {/* Editor Card */}
        <Card className="flex-1 bg-card/30 border-white/5 flex flex-col overflow-hidden shadow-xl backdrop-blur-sm relative">
            <EditorToolbar editor={editor} />
            <div className="flex-1 overflow-y-auto">
                <EditorContent editor={editor} className="h-full w-full" />
            </div>
            
            {/* Visual indicator for blocked writing */}
            {!canWrite && (
                <div className="absolute bottom-4 left-4 right-4 bg-destructive/10 text-destructive border border-destructive/20 p-2 rounded text-center text-sm font-medium backdrop-blur-md animate-in slide-in-from-bottom-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Yazma izniniz bulunmamaktadır. Yalnızca görüntüleyebilirsiniz.
                </div>
            )}
        </Card>
      </div>

      {/* CHAIRMAN SLIDE-OVER PANEL */}
      {session?.user?.role === 'committee_chairman' && (
        <div 
            className={`fixed right-6 top-[100px] bottom-6 w-[340px] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl flex flex-col transition-transform duration-300 z-50 ${showChairmanPanel ? 'translate-x-0' : 'translate-x-[120%]'}`}
        >
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5 rounded-t-xl">
                <h3 className="font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" /> 
                    Üye İzinleri
                </h3>
                <span className="text-xs text-muted-foreground">{members.length} Üye</span>
            </div>

            <div className="p-3 border-b border-white/5">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input 
                        placeholder="Üye ara..." 
                        className="pl-9 h-9 bg-background/50 border-white/10" 
                        value={searchMember}
                        onChange={(e) => setSearchMember(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredMembers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        Üye bulunamadı.
                    </div>
                ) : filteredMembers.map(member => (
                    <div key={member.id} className="group flex items-center justify-between p-3 rounded-lg bg-card/50 hover:bg-card border border-white/5 hover:border-white/10 transition-all">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <Avatar className="h-9 w-9 border border-white/10">
                                <AvatarImage src={`https://avatar.vercel.sh/${member.email}`} />
                                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                    {member.full_name.substring(0, 2).toUpperCase()}
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
                                onCheckedChange={() => handleToggleMemberPermission(member.id, member.userId, member.can_edit)}
                                className="scale-75 data-[state=checked]:bg-green-500"
                             />
                             <span className={`text-[10px] font-medium ${member.can_edit ? 'text-green-500' : 'text-destructive'}`}>
                                 {member.can_edit ? 'Yazabilir' : 'Yazamaz'}
                             </span>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="p-3 border-t border-white/5 bg-white/5 rounded-b-xl text-[10px] text-center text-muted-foreground">
                Değişiklikler anında uygulanır.
            </div>
        </div>
      )}

      {/* STYLES FOR COLLABORATION CURSOR */}
      <style jsx global>{`
        .collaboration-cursor__caret {
          border-left: 2px solid; /* Uses inherited color from inline style */
          margin-left: -1px;
          margin-right: -1px;
          pointer-events: none;
          position: relative;
          word-break: normal;
          display: inline;
        }
        
        .collaboration-cursor__label {
          border-radius: 3px 3px 3px 0;
          color: white;
          font-family: var(--font-sans);
          font-size: 11px;
          font-weight: 600;
          left: -1px;
          padding: 0.1rem 0.4rem;
          position: absolute;
          top: -1.4em;
          user-select: none;
          white-space: nowrap;
          z-index: 10;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          line-height: normal;
        }
      `}</style>

    </div>
  );
}

// Change Log:
// - Removed `canWrite` from `useEditor` dependency array to prevent editor re-creation.
// - Added `useEffect` to handle dynamic updates to `editor.setEditable(canWrite)`.
// - This ensures instant permission updates without page reload or editor disconnect.