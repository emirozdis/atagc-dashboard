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
import { Awareness } from 'y-protocols/awareness';
import { SupabaseYjsProvider } from '@/lib/SupabaseYjsProvider';
import { supabase } from '@/lib/supabase';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, List, ListOrdered, Quote,
  Users, Circle, WifiOff, LogIn
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Input not used here; avatar-based summary used instead
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
];

const ToolbarButton = ({
  onClick,
  isActive = false,
  disabled = false,
  children,
  title
}: {
  onClick: () => void,
  isActive?: boolean,
  disabled?: boolean,
  children: React.ReactNode,
  title?: string
}) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`h-8 w-8 transition-all ${isActive
      ? 'bg-primary/20 text-primary hover:bg-primary/30 hover:text-primary'
      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
      }`}
  >
    {children}
  </Button>
);

const EditorToolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;

  return (
    <div className="border-b border-white/10 p-2 flex flex-wrap gap-1 bg-muted/20 sticky top-0 z-10 backdrop-blur-sm">
      <div className="flex items-center space-x-1 border-r border-white/10 pr-2 mr-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (Cmd+B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (Cmd+I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline (Cmd+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Code"
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="flex items-center space-x-1 border-r border-white/10 pr-2 mr-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          isActive={editor.isActive({ textAlign: 'justify' })}
          title="Justify"
        >
          <AlignJustify className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="flex items-center space-x-1 border-r border-white/10 pr-2 mr-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="flex items-center space-x-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Ordered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>
      </div>

    </div>
  );
};

export default function CollaborativeEditorPage() {
  const { data: session } = useSession();
  const [userName, setUserName] = useState('');
  const ROOM = { id: 'bilisim-teknolojileri-komitesi', name: 'Bilişim Teknolojileri Komitesi' };
  const roomId = ROOM.id;
  const [hasJoined, setHasJoined] = useState(false);
  const [provider, setProvider] = useState<SupabaseYjsProvider | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [status, setStatus] = useState('disconnected');
  const [userColor] = useState(COLORS[Math.floor(Math.random() * COLORS.length)]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      Placeholder.configure({
        placeholder: 'Birlikte yazmaya başlayın...',
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      // Only include collaboration extensions if provider exists
      ...(provider ? [
        Collaboration.configure({
          document: provider.doc,
        }),
        CollaborationCursor.configure({
          provider: provider as any,
          user: {
            name: userName,
            color: userColor,
          },
        }),
      ] : []),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-lg max-w-none focus:outline-none min-h-[500px] p-8 text-foreground',
      },
    },
    editable: hasJoined && !!provider,
  }, [provider]);

  // Set username from session when session changes
  useEffect(() => {
    if (session?.user) {
      setUserName(session.user.name || session.user.email || '');
    }
  }, [session]);

  // Clean up provider on unmount or provider change
  useEffect(() => {
    return () => {
      if (provider) {
        provider.destroy();
      }
    };
  }, [provider]);

  const handleJoinRoom = () => {
    if (!session?.user) {
      toast.error("Eksik Bilgi", { description: "Lütfen giriş yapın ve komite bilgisi mevcut olduğundan emin olun." });
      return;
    }

    try {
      const doc = new Y.Doc();
      const userIdKey = session?.user?.id?.toString() ?? `anon-${Math.random().toString(36).slice(2, 9)}`;
      const channel = supabase.channel(`room:${roomId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: userIdKey },
        }
      });

      const newProvider = new SupabaseYjsProvider({
        channel,
        doc,
        awareness: new Awareness(doc),
      });

      newProvider.on('synced', (isSynced: boolean) => {
        setStatus(isSynced ? 'connected' : 'disconnected');
        if (isSynced) {
          toast.success("Bağlantı Kuruldu", { description: `"${ROOM.name}" odasına başarıyla katıldınız.` });
        }
      });

      // Track user count from awareness
      newProvider.awareness.on('update', () => {
        const states = newProvider.awareness.getStates();
        setUserCount(states.size);
      });

      // Set awareness local state so other users see our name and color
      try {
        newProvider.awareness.setLocalStateField('user', {
          name: userName || session.user?.name || session.user?.email || 'Anon',
          color: userColor,
          id: session.user?.id,
        });
      } catch (err) {
        // ignore if awareness setting isn't available
      }

      setProvider(newProvider);
      setHasJoined(true);
    } catch (e) {
      toast.error("Bağlantı Hatası", { description: "Odaya bağlanırken bir sorun oluştu." });
    }
  };

  if (!hasJoined) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)] animate-fade-in px-4">
        <Card className="w-full max-w-md bg-card/50 border-white/5 shadow-2xl backdrop-blur-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-display font-extrabold tracking-tight leading-snug">
              Ortak Çalışma
            </CardTitle>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Belge düzenlemek için bir odaya katılın.
            </p>
          </CardHeader>

          <CardContent className="space-y-6 flex flex-col items-center text-center">
            <div className="space-y-2 w-full">
              <div className="flex flex-col items-center gap-2 bg-secondary/10 px-4 py-3 rounded-lg">
                <Avatar>
                  {session?.user?.image ? (
                    <AvatarImage src={session.user.image} alt={session.user.name || session.user.email || 'User'} />
                  ) : (
                    <AvatarFallback
                      className="text-sm font-semibold"
                      style={{ backgroundColor: userColor }}
                    >
                      {(session?.user?.name || session?.user?.email || 'A')
                        .split(' ')
                        .map(s => s[0])
                        .slice(0, 2)
                        .join('')}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-medium tracking-wide">
                    {session?.user?.name || session?.user?.email || 'Giriş yapılmadı'}
                  </span>
                  {session?.user?.email && (
                    <span className="text-xs text-muted-foreground tracking-wide">
                      {session.user.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 w-full">
              <div className="flex items-center justify-center gap-3 bg-secondary/10 px-4 py-3 rounded-lg">
                <div className="text-sm font-medium tracking-wide">{ROOM.name}</div>
              </div>
            </div>

            <Button
              onClick={handleJoinRoom}
              className="mx-auto px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md inline-flex items-center justify-center font-medium tracking-wide"
              disabled={!session?.user}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Odaya Katıl
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Ortak Çalışma</h2>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-secondary/50 border border-white/5">
              <span className="text-muted-foreground">Komite:</span>
              <span className="text-primary">{ROOM.name}</span>
            </div>

            <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border border-white/5 ${status === 'connected' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
              }`}>
              {status === 'connected' ? (
                <Circle className="w-2 h-2 fill-current" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              {status === 'connected' ? 'Bağlı' : 'Bağlantı Yok'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-card/30 border border-white/5 px-4 py-2 rounded-lg">
          <Users className="w-5 h-5 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Aktif Kullanıcı</span>
            <span className="text-sm font-bold">{userCount}</span>
          </div>
        </div>
      </div>

      {/* Editor */}
      <Card className="overflow-hidden bg-card/30 border-white/5 shadow-xl flex flex-col min-h-[600px] backdrop-blur-sm">
        <EditorToolbar editor={editor} />
        <EditorContent editor={editor} className="flex-1 w-full" />
      </Card>

      <div className="text-center text-xs text-muted-foreground">
        YJS & Supabase Realtime altyapısı ile anlık senkronizasyon sağlanmaktadır.
      </div>

      {/* Collaboration Cursor Styles */}
      <style jsx global>{`
        .collaboration-cursor__caret {
          border-left: 1px solid white;
          border-right: 1px solid white;
          margin-left: -1px;
          margin-right: -1px;
          pointer-events: none;
          position: relative;
          word-break: normal;
        }

        /* Render the username above the cursor */
        .collaboration-cursor__label {
          border-radius: 3px 3px 3px 0;
          color: #000;
          font-family: inherit;
          font-size: 12px;
          font-style: normal;
          font-weight: 600;
          left: -1px;
          line-height: normal;
          padding: 0.1rem 0.3rem;
          position: absolute;
          top: -1.4em;
          user-select: none;
          white-space: nowrap;
          z-index: 10;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        /* Dark mode specific prose overrides */
        .prose-invert h1, .prose-invert h2, .prose-invert h3, .prose-invert strong {
            color: var(--foreground);
        }
        .prose-invert {
            color: var(--muted-foreground);
        }
      `}</style>
    </div>
  );
}

// Change Log:
// - Created new file `app/dashboard/editor/page.tsx`.
// - Integrated the logic from the user's snippet into the project's Dashboard layout.
// - Replaced raw HTML elements with `Card`, `Button`, `Input` components from `@/components/ui`.
// - Applied dark mode styling (`bg-card/30`, `border-white/5`, `prose-invert`).
// - Styled the toolbar to match the dashboard aesthetic (glass effect, ghost buttons).
// - Improved the "Join Room" interface with a centered Card layout.
// - Added proper error handling and toasts with `sonner`.