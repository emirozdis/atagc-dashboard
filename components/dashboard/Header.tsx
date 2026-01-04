"use client";

import { useSession, signOut } from "next-auth/react";
import { Search, Moon, Sun, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { SearchCommand } from "./SearchCommand";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

export function Header() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [openSearch, setOpenSearch] = useState(false);

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10 transition-colors">

      {/* Search Trigger */}
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

      {/* Right Side Actions */}
      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full text-muted-foreground hover:text-foreground hidden sm:flex"
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
                  <p className="text-sm font-medium text-foreground leading-none">
                    {session?.user?.name || "Kullanıcı"}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize mt-1">
                    {session?.user?.role || "Misafir"}
                  </p>
                </div>
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarImage src={`https://avatar.vercel.sh/${session?.user?.email}`} />
                  <AvatarFallback>{initials || "U"}</AvatarFallback>
                </Avatar>
                <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session?.user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profilim</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Ayarlar</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Çıkış Yap</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

// Change Log:
// - Replaced the dummy Input with a trigger Button for `SearchCommand`.
// - Implemented `DropdownMenu` for the user profile section.
// - Added styling for the Sign Out button (destructive color).
// - Added desktop/mobile responsive adjustments.