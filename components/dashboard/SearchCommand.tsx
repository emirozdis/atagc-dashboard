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
    Settings,
    LogOut,
    ChevronRight
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { participantItems, organisationItems } from "@/lib/navigation";
import { STAFF_ROLES, getEffectiveRole, ORGANISATION_ROLES } from "@/lib/roles";

interface SearchCommandProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

export function SearchCommand({ open, setOpen }: SearchCommandProps) {
    const router = useRouter();
    const { data: session } = useSession();

    const actualRole = session?.user?.role;
    const effectiveRole = session?.user ? getEffectiveRole(session.user) : null;
    const status = session?.user?.applicationStatus;
    
    const isStaff = actualRole ? STAFF_ROLES.includes(actualRole) : false;

    // Use organization items if user is organization, else dashboard items
    const sourceItems = effectiveRole && ORGANISATION_ROLES.includes(effectiveRole as any) 
        ? organisationItems 
        : participantItems;

    const items = sourceItems.filter(item => {
        if (item.roles && effectiveRole && !item.roles.includes(effectiveRole)) return false;
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
                        if (item.href === "/profile" || item.href === "/payment") {
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
                        .filter(item => item.href === "/profile" || item.href === "/payment")
                        .map((item) => (
                            <div key={item.href}>
                                <CommandItem
                                    onSelect={() => runCommand(() => router.push(item.href))}
                                    keywords={item.href === "/profile" ? ['password', 'şifre', 'reset', 'change', 'ayarlar', 'settings'] : []}
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
                        onSelect={() => runCommand(() => router.push("/profile#security"))}
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