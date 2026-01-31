import { Layout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getRoleMeta } from "@/lib/roles";
import { cn } from "@/lib/utils";

interface CommitteeHeroProps {
  name?: string;
  description?: string;
  role?: string;
  children?: React.ReactNode;
  isLoading?: boolean;
}

export const CommitteeHero = ({
  name,
  description,
  role,
  children,
  isLoading
}: CommitteeHeroProps) => {
  const roleMeta = getRoleMeta(role || 'applicant');

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-background via-muted/30 to-background border border-border/50 p-6 md:p-10 shadow-sm">
      <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
        <Layout className="w-96 h-96 -rotate-12" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="space-y-4 max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            {isLoading ? (
              <Skeleton className="h-6 w-24 rounded-full" />
            ) : (
              <Badge variant="outline" className={cn("border-primary/20 px-3 py-1 text-xs uppercase tracking-wider", roleMeta.colorClass)}>
                {roleMeta.label}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground font-medium">ATAGÇ 2026</span>
          </div>

          <div>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-4 w-96 max-w-full" />
              </div>
            ) : (
              <>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold tracking-tight text-foreground leading-tight">
                  {name}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2 line-clamp-2">
                  {description}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 w-full md:w-auto border-t md:border-t-0 md:border-l border-border/50 pt-6 md:pt-0 md:pl-8">
          {children}
        </div>
      </div>
    </div>
  );
}