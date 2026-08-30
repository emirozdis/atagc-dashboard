"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  UserCheck,
  UserX,
  Check,
  Trash2,
  AlertCircle
} from "lucide-react";
import { User as UserType } from "@/types/user";
import { cn } from "@/lib/utils";
import { ROLE_METADATA, ROLES, UserRole } from "@/lib/roles";

interface ManageUserDialogProps {
  user: UserType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateRole: (userId: string, newRole: string) => Promise<void>;
  onToggleSuspend: (userId: string, isSuspended: boolean) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}

export function ManageUserDialog({
  user,
  open,
  onOpenChange,
  onUpdateRole,
  onToggleSuspend,
  onDelete
}: ManageUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"main" | "role_select">("main");

  const [selectedRole, setSelectedRole] = useState<string>("");

  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteCooldown, setDeleteCooldown] = useState(0);

  const hasActiveConfirmation = showRoleConfirm || showSuspendConfirm || showDeleteConfirm;

  useEffect(() => {
    if (open && user) {
      // Reset the draft when the selected user changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedRole(user.role);
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setView("main");
        setShowRoleConfirm(false);
        setShowSuspendConfirm(false);
        setShowDeleteConfirm(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!showDeleteConfirm) return;
    const timer = window.setInterval(() => {
      setDeleteCooldown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [showDeleteConfirm]);

  if (!user) return null;

  const handleRoleChangeRequest = (roleId: string) => {
    setSelectedRole(roleId);
    if (roleId !== user.role) {
      setShowRoleConfirm(true);
    } else {
      setView("main");
    }
  };

  const executeRoleUpdate = async () => {
    setLoading(true);
    try {
      await onUpdateRole(user.id, selectedRole);
      setView("main");
    } finally {
      setLoading(false);
      setShowRoleConfirm(false);
    }
  };

  const executeSuspend = async () => {
    setLoading(true);
    try {
      await onToggleSuspend(user.id, !user.is_suspended);
      onOpenChange(false);
    } finally {
      setLoading(false);
      setShowSuspendConfirm(false);
    }
  };

  const executeDelete = async () => {
    setLoading(true);
    try {
      await onDelete(user.id);
      onOpenChange(false);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const currentRoleMeta = ROLE_METADATA[user.role as UserRole] || ROLE_METADATA[ROLES.APPLICANT];
  const newRoleMeta = ROLE_METADATA[selectedRole as UserRole] || ROLE_METADATA[ROLES.APPLICANT];

  return (
    <>
      <Dialog
        open={open && !hasActiveConfirmation}
        onOpenChange={(val) => !loading && onOpenChange(val)}
      >
        <DialogContent className="sm:max-w-[500px] gap-0 p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-display font-bold">User management</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">{user.full_name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 pt-2 space-y-6">
            {view === "main" && (
              <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Current role</Label>
                  <div className={cn(
                    "flex items-start gap-4 p-4 rounded-xl border transition-all",
                    "bg-card hover:bg-accent/5 cursor-pointer group",
                    currentRoleMeta.borderClass
                  )} onClick={() => setView("role_select")}>
                    <div className={cn("p-2.5 rounded-lg shrink-0", currentRoleMeta.bgClass, currentRoleMeta.colorClass)}>
                      <currentRoleMeta.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{currentRoleMeta.label}</h4>
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground group-hover:text-primary">Change</Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed pr-8">
                        {currentRoleMeta.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Account actions</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className={cn(
                        "h-auto py-3 flex flex-col items-center gap-2 border-dashed border-2 hover:border-solid",
                        user.is_suspended
                          ? "border-green-500/30 hover:bg-green-500/5 hover:border-green-500 hover:text-green-600"
                          : "border-yellow-500/30 hover:bg-yellow-500/5 hover:border-yellow-500 hover:text-yellow-600"
                      )}
                      onClick={() => setShowSuspendConfirm(true)}
                    >
                      {user.is_suspended ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                      <span className="text-xs font-semibold">{user.is_suspended ? "Restore access" : "Suspend"}</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-2 border-dashed border-2 border-destructive/30 hover:bg-destructive/5 hover:border-destructive hover:text-destructive"
                      onClick={() => { setDeleteCooldown(3); setShowDeleteConfirm(true); }}
                    >
                      <Trash2 className="w-5 h-5" />
                      <span className="text-xs font-semibold">Delete user</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {view === "role_select" && (
              <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="flex items-center justify-between">
                  <Label>Select a role to assign</Label>
                  <Button variant="ghost" size="sm" onClick={() => setView("main")} className="h-6 text-xs">Cancel</Button>
                </div>
                <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {Object.values(ROLES).map((roleKey) => {
                    const meta = ROLE_METADATA[roleKey];
                    const isActive = selectedRole === roleKey;
                    const Icon = meta.icon;
                    return (
                      <div
                        key={roleKey}
                        onClick={() => handleRoleChangeRequest(roleKey)}
                        className={cn(
                          "relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.01]",
                          isActive
                            ? `border-${meta.colorClass.split('-')[1]}-500 bg-accent shadow-sm`
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        <div className={cn("p-2 rounded-md", meta.bgClass, meta.colorClass)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm flex items-center gap-2">
                            {meta.label}
                            {isActive && <Check className="w-3.5 h-3.5 text-primary animate-in zoom-in" />}
                          </div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1">
                            {meta.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRoleConfirm} onOpenChange={(val) => { setShowRoleConfirm(val); if (!val) setView("role_select"); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm role change</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{user.full_name}</strong>&apos;s role will be changed to <br />
              <span className="font-semibold text-foreground">{currentRoleMeta.label}</span> &rarr; <span className={cn("font-bold", newRoleMeta.colorClass)}>{newRoleMeta.label}</span>
              <br />.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setView("role_select")}>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={executeRoleUpdate} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirm and change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSuspendConfirm} onOpenChange={setShowSuspendConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={user.is_suspended ? "text-green-600" : "text-yellow-600"}>
              {user.is_suspended ? "Restore access" : "Suspend user"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {user.is_suspended
                ? "This user will be allowed to sign in again."
                : "This user will temporarily be unable to sign in."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeSuspend}
              disabled={loading}
              className={user.is_suspended ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {user.is_suspended ? "Restore access" : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              MAKE SURE YOU UNDERSTAND
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the user and all related conference data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} disabled={loading || deleteCooldown > 0} className="bg-destructive text-white hover:bg-destructive/90">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {deleteCooldown > 0 ? `Delete user (${deleteCooldown})` : "I understand — delete user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
