"use client";

import { useEffect } from "react";
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
    ScanLine,
    Megaphone,
    FolderOpen,
    UsersRound,
    CreditCard,
    LogOut,
    ChevronRight
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { participantItems } from "@/lib/navigation";

interface SearchCommandProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

export function SearchCommand({ open, setOpen }: SearchCommandProps) {
    const router = useRouter();
    const { data: session } = useSession();
    
    const role = session?.user?.role;
    const status = session?.user?.applicationStatus;

    // Filter items based on role and approval status (same logic as Sidebar)
    const items = participantItems.filter(item => {
        // 1. Role Check
        if (item.roles && role && !item.roles.includes(role)) return false;
        
        // 2. Approval Check (only for applicants or generic roles that need approval)
        // Staff roles (admin/chairs) are usually implicitly approved
        const isStaff = ['superadmin', 'admin', 'committee_chairman', 'deputy_chair'].includes(role || "");
        if (!isStaff && status !== 'approved' && item.requiresApproved) return false;
        
        return true;
    });

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
                    {items.map((item) => {
                        // Skip profile and payment items - they'll be in separate groups
                        if (item.href === "/dashboard/profile" || item.href === "/dashboard/payment") {
                            return null;
                        }
                        return (
                            <div key={item.href}>
                                <CommandItem 
                                    onSelect={() => runCommand(() => router.push(item.href))}
                                >
                                    <item.icon className="mr-2 h-4 w-4" />
                                    {item.title}
                                </CommandItem>
                                {item.subItems && item.subItems.map((subItem) => (
                                    <CommandItem
                                        key={subItem.href}
                                        onSelect={() => runCommand(() => router.push(subItem.href))}
                                        keywords={subItem.keywords}
                                        className="pl-8"
                                    >
                                        <ChevronRight className="mr-2 h-3 w-3 text-muted-foreground" />
                                        <subItem.icon className="mr-2 h-4 w-4" />
                                        {subItem.title}
                                    </CommandItem>
                                ))}
                            </div>
                        );
                    })}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Profil ve Ödeme">
                    {items
                        .filter(item => item.href === "/dashboard/profile" || item.href === "/dashboard/payment")
                        .map((item) => (
                            <div key={item.href}>
                                <CommandItem 
                                    onSelect={() => runCommand(() => router.push(item.href))}
                                    keywords={item.href === "/dashboard/profile" ? ['password', 'şifre', 'reset', 'change', 'ayarlar', 'settings'] : []}
                                >
                                    <item.icon className="mr-2 h-4 w-4" />
                                    {item.title}
                                </CommandItem>
                                {item.subItems && item.subItems.map((subItem) => (
                                    <CommandItem
                                        key={subItem.href}
                                        onSelect={() => runCommand(() => router.push(subItem.href))}
                                        keywords={subItem.keywords}
                                        className="pl-8"
                                    >
                                        <ChevronRight className="mr-2 h-3 w-3 text-muted-foreground" />
                                        <subItem.icon className="mr-2 h-4 w-4" />
                                        {subItem.title}
                                    </CommandItem>
                                ))}
                            </div>
                        ))}
                    <CommandItem 
                        keywords={['password', 'şifre', 'reset', 'change', 'ayarlar', 'settings']} 
                        onSelect={() => runCommand(() => router.push("/dashboard/profile#security"))}
                    >
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