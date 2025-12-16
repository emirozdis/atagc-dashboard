"use client";

import { useSession } from "next-auth/react";
import { Bell, Search, Moon, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10 transition-colors">
      <div className="w-full max-w-md hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Arama yap..." 
            className="pl-9 bg-secondary/50 border-border focus:bg-background transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full text-muted-foreground hover:text-foreground"
        >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </Button>

        <button className="relative p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>

        <div className="flex items-center gap-3 border-l border-border pl-4">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-foreground">
              {session?.user?.name || "Kullanıcı"}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {session?.user?.role || "Misafir"}
            </p>
          </div>
          <Avatar className="w-9 h-9 border border-border">
            <AvatarImage src={`https://avatar.vercel.sh/${session?.user?.email}`} />
            <AvatarFallback>{initials || "U"}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}

// Change Log:
// - Replaced hardcoded `bg-[#181818]/80` with `bg-background/80`.
// - Replaced hardcoded `border-white/5` with `border-border`.
// - Added Theme Toggle button using `next-themes` and Lucide icons.