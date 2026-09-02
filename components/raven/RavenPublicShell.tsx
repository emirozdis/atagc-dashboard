import type { ReactNode } from "react";
import RavenHomeBackground from "@/components/raven/RavenHomeBackground";
import RavenPublicNav from "@/components/raven/RavenPublicNav";
import { RAVENMUN_CONFERENCE } from "@/config/ravenmun";

export default function RavenPublicShell({
  children,
  showFooter = true,
}: {
  children: ReactNode;
  showFooter?: boolean;
}) {
  return (
    <div className="font-[family-name:var(--font-raven-display)] raven-template-home relative min-h-dvh w-full text-white">
      <RavenHomeBackground showRaven={false} />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <RavenPublicNav />
        <div className="flex-1">{children}</div>
        {showFooter ? (
          <footer className="shrink-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 text-center text-sm leading-6 text-white/80">
            <p>&copy; {RAVENMUN_CONFERENCE.year} RAVENMUN, All Rights Reserved.</p>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
