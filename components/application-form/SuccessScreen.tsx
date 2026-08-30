import { CheckCircle, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SuccessScreenProps {
  onReset: () => void;
}

export function SuccessScreen({ onReset }: SuccessScreenProps) {
  return (
    <div className="animate-fade-in py-8 text-center md:py-12">
      <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle className="h-10 w-10 text-primary" />
      </div>
      <h2 className="gold-gradient mb-4 text-2xl font-bold md:text-3xl">Application received</h2>
      <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
        Your application was submitted successfully. The conference team will review it and send updates to your verified email address.
      </p>
      <div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Button asChild className="h-12 w-full px-8 sm:w-auto">
          <Link href="/portal">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Open participant portal
          </Link>
        </Button>
        <Button variant="outline" onClick={onReset} className="h-12 w-full border-primary/30 px-8 text-primary hover:bg-primary/10 sm:w-auto">
          Submit another application
        </Button>
      </div>
      <p className="border-t border-border/40 pt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        RavenMUN 2026 Organizing Committee
      </p>
    </div>
  );
}
