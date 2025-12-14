"use client";

import { useSession } from "next-auth/react";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Header() {
  const { data: session } = useSession();
  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 border-b border-white/5 bg-[#181818]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="w-full max-w-md hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Arama yap..." 
            className="pl-9 bg-white/5 border-white/5 focus:bg-white/10 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <button className="relative p-2 rounded-full hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>

        <div className="flex items-center gap-3 border-l border-white/10 pl-4">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-foreground">
              {session?.user?.name || "Kullanıcı"}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {session?.user?.role || "Misafir"}
            </p>
          </div>
          <Avatar className="w-9 h-9 border border-white/10">
            <AvatarImage src={`https://avatar.vercel.sh/${session?.user?.email}`} />
            <AvatarFallback>{initials || "U"}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}

// Change Log:
// - Updated background to `bg-[#181818]/80` with `backdrop-blur-md`.
// - Updated borders to `border-white/5` and `border-white/10` to match the login theme.
// - Updated Input background and hover states to be more subtle (`bg-white/5`).