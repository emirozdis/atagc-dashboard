"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    LayoutDashboard,
    User,
    Settings,
    Briefcase,
    PenTool,
    QrCode,
    FileText,
    LogOut
} from "lucide-react";
import { signOut } from "next-auth/react";

interface SearchCommandProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

export function SearchCommand({ open, setOpen }: SearchCommandProps) {
    const router = useRouter();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen(true);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [setOpen]);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Bir komut yazın veya arayın..." />
            <CommandList>
                <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>

                <CommandGroup heading="Genel">
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Panel (Dashboard)
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/announcements"))}>
                        <FileText className="mr-2 h-4 w-4" />
                        Duyurular
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/committee"))}>
                        <Briefcase className="mr-2 h-4 w-4" />
                        Komitem
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/editor"))}>
                        <PenTool className="mr-2 h-4 w-4" />
                        Ortak Çalışma (Editor)
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/scan"))}>
                        <QrCode className="mr-2 h-4 w-4" />
                        Yoklama Ver
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Profil ve Ayarlar">
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/profile"))}>
                        <User className="mr-2 h-4 w-4" />
                        Profilim
                    </CommandItem>
                    <CommandItem keywords={['password', 'şifre', 'reset', 'change']} onSelect={() => runCommand(() => router.push("/dashboard/profile"))}>
                        <Settings className="mr-2 h-4 w-4" />
                        Şifre ve Ayarlar
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Oturum">
                    <CommandItem onSelect={() => runCommand(() => signOut({ callbackUrl: "/login" }))}>
                        <LogOut className="mr-2 h-4 w-4 text-destructive" />
                        <span className="text-destructive">Çıkış Yap</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}

// Change Log:
// - Implemented Command Palette using `cmdk` (shadcn/ui Command).
// - Added keyboard shortcut support (Ctrl+K).
// - Mapped keywords like 'password', 'reset' to navigate to profile settings.