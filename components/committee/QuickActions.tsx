import Link from "next/link";
import { PenTool, ArrowRight, BarChart, Archive } from "lucide-react";

interface QuickActionsProps {
  onOpenVoting: () => void;
}

export const QuickActions = ({ onOpenVoting }: QuickActionsProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <Link href="/dashboard/editor" className="group">
      <div className="h-full border border-border/50 bg-card rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer shadow-sm hover:shadow-md">
        <div className="p-3 bg-primary/5 text-primary rounded-lg group-hover:scale-105 transition-transform">
          <PenTool className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Collaborative document</h3>
          <p className="text-xs text-muted-foreground">Resolution Paper</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
      </div>
    </Link>

    <div
      onClick={onOpenVoting}
      className="group h-full border border-border/50 bg-card rounded-xl p-4 flex items-center gap-4 hover:border-blue-500/30 hover:bg-muted/30 transition-all cursor-pointer shadow-sm hover:shadow-md"
    >
      <div className="p-3 bg-blue-500/5 text-blue-600 rounded-lg group-hover:scale-105 transition-transform">
        <BarChart className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-sm">Voting center</h3>
        <p className="text-xs text-muted-foreground">History & new votes</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
    </div>

    <Link href="/dashboard/resources" className="group">
      <div className="h-full border border-border/50 bg-card rounded-xl p-4 flex items-center gap-4 hover:border-purple-500/30 hover:bg-muted/30 transition-all cursor-pointer shadow-sm hover:shadow-md">
        <div className="p-3 bg-purple-500/5 text-purple-600 rounded-lg group-hover:scale-105 transition-transform">
          <Archive className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Resources</h3>
          <p className="text-xs text-muted-foreground">Files & guides</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  </div>
);
