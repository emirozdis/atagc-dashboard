"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { SessionExpiredDialog } from "@/components/auth/SessionExpiredDialog";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} enableColorScheme>
          {children}
          <SessionExpiredDialog />
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}

// Change Log:
// - Added `SessionExpiredDialog` to the global provider tree.