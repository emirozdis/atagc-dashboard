"use client";

import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ListTodo, Clock, CheckCircle2, AlertTriangle, Check, X } from "lucide-react";

interface Task {
  id: string;
  assigned_by: string;
  assigned_task: string;
  task_description: string | null;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  assigned: { label: "In progress", variant: "outline", color: "text-cyan-500" },
  cancelled: { label: "Cancelled", variant: "outline", color: "text-red-500" },
  completed: { label: "Completed", variant: "outline", color: "text-emerald-500" },
};

export default function MyTasksPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const handleTaskAction = async (taskId: string, action: "complete" | "cancel") => {
    if (action === "cancel") {
      const reason = prompt("Enter a cancellation reason:");
      if (reason === null) return; // user pressed cancel on prompt
      // TODO: send reason to the API later
    }

    try {
      const res = await fetch("/api/observer/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_task_id: taskId, action }),
      });
      if (!res.ok) throw new Error("Failed");
      queryClient.invalidateQueries({ queryKey: ["observer-info"] });
    } catch {
      alert("Action failed.");
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["observer-info"],
    queryFn: async () => {
      const res = await fetch("/api/observer/info");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<{ tasks: Task[] }>;
    },
  });

  const tasks = data?.tasks || [];
  const assignedCount = tasks.filter((t) => t.status === "assigned").length;
  const cancelledCount = tasks.filter((t) => t.status === "cancelled").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-12 space-y-8">
      <Breadcrumbs items={[{ label: "Organisation", href: "/organisation" }, { label: "My tasks" }]} />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">
            My tasks
          </h2>
          <p className="text-muted-foreground mt-2 text-lg">
            Track your assigned tasks here.
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50 shadow-sm bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-2.5 rounded-lg bg-amber-500/10">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-7 w-8" /> : assignedCount}</div>
              <div className="text-xs text-muted-foreground">Assigned</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-2.5 rounded-lg bg-orange-500/10">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-7 w-8" /> : cancelledCount}</div>
              <div className="text-xs text-muted-foreground">Cancelled</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-2.5 rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-7 w-8" /> : completedCount}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border/50 shadow-sm bg-card">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-secondary/10">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center mb-5">
              <ListTodo className="w-7 h-7 text-muted-foreground" />
            </div>
            <h4 className="font-semibold text-xl text-foreground mb-2">No tasks assigned yet</h4>
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
              Tasks assigned by the head of administrative staff will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const config = statusConfig[task.status] || statusConfig.assigned;
            return (
              <Card key={task.id} className="border-border/50 shadow-sm bg-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{task.assigned_task}</h4>
                      {task.task_description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{task.task_description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(task.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <Badge variant={config.variant}>
                        <span className={config.color}>{config.label}</span>
                      </Badge>
                      {task.status === "assigned" && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleTaskAction(task.id, "complete")}
                            className="p-1 rounded-md hover:bg-emerald-500/10 text-emerald-500 transition-colors"
                            title="Complete"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleTaskAction(task.id, "cancel")}
                            className="p-1 rounded-md hover:bg-red-500/10 text-red-500 transition-colors"
                            title="Cancel task"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
