"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { SessionExpiredDialog } from "@/components/auth/SessionExpiredDialog";
import BrowserNoiseGuard from "@/components/BrowserNoiseGuard";
import { Megaphone, X, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function AnnouncementBar() {
  const announcement = process.env.NEXT_PUBLIC_ANNOUNCEMENT_TEXT;
  const [isVisible, setIsVisible] = useState(Boolean(announcement));
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isVisible) {
      root.classList.add("announcement-visible");
      root.style.setProperty('--announcement-height', '40px');
    } else {
      root.classList.remove("announcement-visible");
      root.style.setProperty('--announcement-height', '0px');
    }
    return () => {
      root.classList.remove("announcement-visible");
      root.style.setProperty('--announcement-height', '0px');
    };
  }, [isVisible]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
  };

  if (!isVisible || !announcement) {
    return null;
  }

  return (
    <>
      <div 
        id="global-announcement-bar"
        onClick={() => setIsModalOpen(true)}
        className="bg-gradient-to-r from-[#b8860b] via-[#d4af37] to-[#b8860b] text-black text-xs md:text-sm font-bold px-4 shadow-md flex items-center justify-between gap-4 fixed top-0 left-0 right-0 z-[1001] h-10 w-full cursor-pointer hover:brightness-105 transition-all group"
      >
        <div className="flex items-center gap-2 truncate flex-1 justify-center">
          <Megaphone className="w-4 h-4 shrink-0 animate-pulse" />
          <span className="truncate pr-2">{announcement}</span>
          <span className="hidden sm:inline-flex text-[10px] bg-black/10 px-1.5 py-0.5 rounded border border-black/5 items-center gap-1 group-hover:bg-black/20 transition-colors">
            Details <Info className="w-3 h-3" />
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-full hover:bg-black/10 shrink-0 transition-colors cursor-pointer"
          aria-label="Close announcement"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display">
              <Megaphone className="w-5 h-5 text-primary" />
              System announcement
            </DialogTitle>
            <DialogDescription className="pt-2">
              General information from the conference team.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-foreground leading-relaxed whitespace-pre-wrap">
              {announcement}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setIsModalOpen(false)}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
            >
              Got it
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} enableColorScheme>
          <AnnouncementBar />
          <BrowserNoiseGuard />
          {children}
          <SessionExpiredDialog />
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
