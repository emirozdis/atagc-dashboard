import { Users, UserCheck, Clock } from "lucide-react";

interface SessionInfoPanelProps {
  stats: {
    total_members: number;
    last_roll_call: {
      attendance_rate: number;
      session_name: string;
    } | null;
  } | null;
}

export const SessionInfoPanel = ({ stats }: SessionInfoPanelProps) => {
  if (!stats) return <div className="h-20 w-48 bg-white/5 animate-pulse rounded-lg" />;

  return (
    <div className="flex flex-col gap-4 min-w-[200px] text-right md:text-left md:items-end">
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Member</span>
          <div className="text-2xl font-bold text-foreground flex items-center gap-1">
            {stats.total_members}
            <Users className="w-4 h-4 text-muted-foreground/50" />
          </div>
        </div>
        <div className="h-8 w-px bg-border/50" />
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Attendance</span>
          <div className="text-2xl font-bold text-foreground flex items-center gap-1">
            %{stats.last_roll_call?.attendance_rate ?? 0}
            <UserCheck className="w-4 h-4 text-muted-foreground/50" />
          </div>
        </div>
      </div>

      {stats.last_roll_call && (
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-background/40 px-3 py-1.5 rounded-full border border-border/50">
          <Clock className="w-3 h-3" />
          <span className="opacity-90">Last: {stats.last_roll_call.session_name}</span>
        </div>
      )}
    </div>
  );
};
