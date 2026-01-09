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
  ShieldAlert,
  ShieldCheck,
  Shield,
  UserCheck,
  UserX,
  Check,
  Trash2,
  AlertCircle,
  Users
} from "lucide-react";
import { User } from "@/types/user";
import { cn } from "@/lib/utils";

interface ManageUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateRole: (userId: string, newRole: string) => Promise<void>;
  onToggleSuspend: (userId: string, isSuspended: boolean) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}

const ROLES = [
  {
    id: "applicant",
    label: "Katılımcı",
    description: "Standart kullanıcı. Başvuru yapabilir, komitelere katılabilir.",
    icon: Users,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20"
  },
  {
    id: "deputy_chair",
    label: "Başkan Yardımcısı (Deputy Chair)",
    description: "Komite yönetimine yardımcı olur. Yoklama ve oylama başlatabilir.",
    icon: Shield,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20"
  },
  {
    id: "committee_chairman",
    label: "Komite Başkanı",
    description: "Atandığı komiteyi yönetir. Tam komite yetkisine sahiptir.",
    icon: ShieldCheck,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20"
  },
  {
    id: "admin",
    label: "Yönetici",
    description: "Sistem yönetimi ve kullanıcı işlemleri.",
    icon: ShieldAlert,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20"
  },
  {
    id: "superadmin",
    label: "Süper Yönetici",
    description: "Tam yetki. Tüm sistemi yönetebilir, ayarları değiştirebilir.",
    icon: ShieldAlert,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20"
  },
];

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

  // Staged changes
  const [selectedRole, setSelectedRole] = useState<string>("");

  // Confirmation Dialog States
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Computed state to hide main dialog when a confirmation is open
  const hasActiveConfirmation = showRoleConfirm || showSuspendConfirm || showDeleteConfirm;

  // Initialize state when user changes or dialog opens
  useEffect(() => {
    if (open && user) {
      setSelectedRole(user.role);
    }
  }, [open, user]);

  // Reset View State only when completely closed
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

  const currentRoleObj = ROLES.find(r => r.id === user.role) || ROLES[0];
  const newRoleObj = ROLES.find(r => r.id === selectedRole) || ROLES[0];

  return (
    <>
      <Dialog
        open={open && !hasActiveConfirmation}
        onOpenChange={(val) => !loading && onOpenChange(val)}
      >
        <DialogContent className="sm:max-w-[500px] gap-0 p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-display font-bold">Kullanıcı Yönetimi</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">{user.full_name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 pt-2 space-y-6">
            {view === "main" && (
              <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Mevcut Rol</Label>
                  <div className={cn(
                    "flex items-start gap-4 p-4 rounded-xl border transition-all",
                    "bg-card hover:bg-accent/5 cursor-pointer group",
                    currentRoleObj.border
                  )} onClick={() => setView("role_select")}>
                    <div className={cn("p-2.5 rounded-lg shrink-0", currentRoleObj.bg, currentRoleObj.color)}>
                      <currentRoleObj.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{currentRoleObj.label}</h4>
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground group-hover:text-primary">Değiştir</Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed pr-8">
                        {currentRoleObj.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Hesap İşlemleri</Label>
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
                      <span className="text-xs font-semibold">{user.is_suspended ? "Erişimi Aç" : "Askıya Al"}</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-2 border-dashed border-2 border-destructive/30 hover:bg-destructive/5 hover:border-destructive hover:text-destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="w-5 h-5" />
                      <span className="text-xs font-semibold">Kullanıcıyı Sil</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {view === "role_select" && (
              <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="flex items-center justify-between">
                  <Label>Atanacak Rolü Seçiniz</Label>
                  <Button variant="ghost" size="sm" onClick={() => setView("main")} className="h-6 text-xs">İptal</Button>
                </div>
                <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {ROLES.map((role) => {
                    const isActive = selectedRole === role.id;
                    const Icon = role.icon;
                    return (
                      <div
                        key={role.id}
                        onClick={() => handleRoleChangeRequest(role.id)}
                        className={cn(
                          "relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.01]",
                          isActive
                            ? `border-${role.color.split('-')[1]}-500 bg-accent shadow-sm`
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        <div className={cn("p-2 rounded-md", role.bg, role.color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm flex items-center gap-2">
                            {role.label}
                            {isActive && <Check className="w-3.5 h-3.5 text-primary animate-in zoom-in" />}
                          </div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1">
                            {role.description}
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
            <AlertDialogTitle>Rol Değişikliğini Onayla</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{user.full_name}</strong> kullanıcısının rolünü <br />
              <span className="font-semibold text-foreground">{currentRoleObj.label}</span> &rarr; <span className={cn("font-bold", newRoleObj.color)}>{newRoleObj.label}</span>
              <br /> olarak değiştirmek üzeresiniz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setView("role_select")}>Geri Dön</AlertDialogCancel>
            <AlertDialogAction onClick={executeRoleUpdate} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Onayla ve Değiştir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSuspendConfirm} onOpenChange={setShowSuspendConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={user.is_suspended ? "text-green-600" : "text-yellow-600"}>
              {user.is_suspended ? "Erişim Engelini Kaldır" : "Kullanıcıyı Askıya Al"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {user.is_suspended
                ? "Bu kullanıcının sisteme tekrar giriş yapmasına izin verilecektir."
                : "Bu kullanıcı geçici olarak sisteme giriş yapamayacaktır."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeSuspend}
              disabled={loading}
              className={user.is_suspended ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {user.is_suspended ? "Engeli Kaldır" : "Askıya Al"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Kullanıcıyı Kalıcı Olarak Sil
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Kullanıcı ve ilgili tüm veriler silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} disabled={loading} className="bg-destructive text-white hover:bg-destructive/90">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Change Log:
// - Removed 'staff' and 'staffleader' from ROLES.
// - Added 'deputy_chair' to ROLES.