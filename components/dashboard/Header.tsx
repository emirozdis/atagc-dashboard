"use client";

import { useSession, signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Search, Moon, Sun, User, Settings, LogOut, ChevronDown, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { SearchCommand } from "./SearchCommand";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { MobileSidebar } from "./MobileSidebar";
import { AdminMobileSidebar } from "./AdminMobileSidebar";
import { OrganisationMobileSidebar } from "../organisation/OrganisationMobileSidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getRoleMeta } from "@/lib/roles";

export function Header() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [openSearch, setOpenSearch] = useState(false);
  const [openMobileMenu, setOpenMobileMenu] = useState(false);

  const isAdminRoute = pathname?.startsWith("/admin");
  const isOrganisationRoute = pathname?.startsWith("/organisation");

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/participant/me");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const initials = session?.user?.name?.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  const userDetails = profile?.userDetails || (Array.isArray(profile?.user?.user_details) ? profile?.user?.user_details[0] : profile?.user?.user_details);
  const profileImage = userDetails?.profile_picture_url || undefined;

  const roleMeta = getRoleMeta(session?.user?.role);
  const roleLabel = session?.user ? roleMeta.label : "Misafir";

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-10 transition-colors">
      <div className="flex md:hidden mr-4">
        <Sheet open={openMobileMenu} onOpenChange={setOpenMobileMenu}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menüyü Aç</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 border-none w-72">
            <SheetHeader className="sr-only">
              <SheetTitle>Menü</SheetTitle>
              <SheetDescription>
                Navigasyon menüsü
              </SheetDescription>
            </SheetHeader>
            {isAdminRoute ? (
              <AdminMobileSidebar onClose={() => setOpenMobileMenu(false)} />
            ) : isOrganisationRoute ? (
              <OrganisationMobileSidebar onClose={() => setOpenMobileMenu(false)} />
            ) : (
              <MobileSidebar onClose={() => setOpenMobileMenu(false)} />
            )}
          </SheetContent>
        </Sheet>
      </div>

      <div className="w-full max-w-md hidden md:block">
        <div className="relative">
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground bg-secondary/20 hover:bg-secondary/40 border-border"
            onClick={() => setOpenSearch(true)}
          >
            <Search className="mr-2 h-4 w-4" />
            <span className="hidden lg:inline">Ara... (Sayfalar, Ayarlar)</span>
            <span className="inline lg:hidden">Ara...</span>
            <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </div>
      </div>

      <SearchCommand open={openSearch} setOpen={setOpenSearch} />

      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full text-muted-foreground hover:text-foreground flex"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <div className="border-l border-border pl-4 ml-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-full pl-0 hover:bg-transparent p-0 flex items-center gap-3">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-foreground leading-none">{session?.user?.name || "Kullanıcı"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{roleLabel}</p>
                </div>
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarImage
                    src={profileImage}
                    className="object-cover" 
                  />
                  <AvatarFallback>{initials || "U"}</AvatarFallback>
                </Avatar>
                <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{session?.user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer"><User className="mr-2 h-4 w-4" /><span>Profilim</span></Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer" onClick={() => signOut({ callbackUrl: "/login" })}>
                <LogOut className="mr-2 h-4 w-4" /><span>Çıkış Yap</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}