"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { X, Maximize2, ShieldCheck, Calendar, Hash, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

interface DigitalIdCardProps {
  user: {
    id: string;
    full_name: string;
    role: string;
    created_at: string;
  };
  className?: string;
  uniqueId?: string;
}

export function DigitalIdCard({ user, className, uniqueId = "default" }: DigitalIdCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Role Formatting
  const roleName = user.role === 'applicant' ? 'DELEGE' : user.role.toUpperCase().replace('_', ' ');
  const shortId = user.id.split('-')[0].toUpperCase();
  const joinDate = new Date(user.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Clean spring transition for structural morphing
  // Cast as const to ensure 'type' is treated as literal "spring" not string
  const transition = { type: "spring", damping: 25, stiffness: 300 } as const;
  const layoutKey = `${uniqueId}-${user.id}`;

  return (
    <>
      {/* --- Minimized Card --- */}
      <motion.div
        layoutId={`card-container-${layoutKey}`}
        className={cn(
          "relative overflow-hidden rounded-xl bg-card border border-border shadow-sm hover:shadow-md cursor-pointer group transition-shadow",
          className
        )}
        onClick={() => setIsOpen(true)}
        style={{ borderRadius: 16 }}
      >
        <div className="p-5 flex flex-col h-full relative z-10">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <motion.div 
              layout="position" 
              className="flex items-center gap-2 text-muted-foreground"
            >
              <User className="w-4 h-4" />
              <span className="text-[10px] font-bold tracking-widest uppercase">Dijital Kimlik</span>
            </motion.div>
            <motion.div layout="position">
              <Maximize2 className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            {/* QR Code Container */}
            <motion.div 
              layoutId={`card-qr-container-${layoutKey}`}
              className="bg-white p-2 rounded-lg"
              style={{ borderRadius: 12 }}
            >
              <QRCodeSVG value={user.id} size={90} level="M" />
            </motion.div>

            {/* Text Content (Fade Only - No Morph to prevent stretch) */}
            <motion.div 
              layout="position"
              className="text-center space-y-1.5"
            >
              <motion.h3 
                layout="position"
                className="text-base font-bold text-foreground tracking-tight leading-none"
              >
                {user.full_name}
              </motion.h3>
              <motion.div layout="position">
                <Badge variant="secondary" className="font-medium text-[10px] px-2 h-5">
                  {roleName}
                </Badge>
              </motion.div>
            </motion.div>
          </div>

          {/* Footer */}
          <motion.div 
            layout="position" 
            className="mt-4 pt-3 border-t border-border flex justify-between items-center text-[10px] font-mono text-muted-foreground"
          >
            <span>{shortId}</span>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500">
              <div className="w-1.5 h-1.5 rounded-full bg-current" />
              AKTİF
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* --- Maximized Overlay (Portal) --- */}
      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
              
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
              />

              {/* Expanded Card */}
              <motion.div
                layoutId={`card-container-${layoutKey}`}
                className="relative w-full max-w-[360px] bg-card border border-border shadow-2xl overflow-hidden flex flex-col"
                transition={transition}
                style={{ borderRadius: 24 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors z-20"
                >
                  <X className="w-5 h-5" />
                </motion.button>

                <div className="p-8 flex flex-col items-center text-center space-y-8 h-full bg-card">
                  
                  {/* Header Info */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-3 pt-2"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">Katılımcı Kartı</span>
                      <h2 className="text-2xl font-bold text-foreground tracking-tight">{user.full_name}</h2>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 px-3 py-1 text-xs">
                      {roleName}
                    </Badge>
                  </motion.div>

                  {/* QR Code - Shared Element */}
                  <motion.div 
                    layoutId={`card-qr-container-${layoutKey}`}
                    className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-black/5"
                    style={{ borderRadius: 16 }}
                  >
                    <QRCodeSVG value={user.id} size={200} level="H" className="w-full h-auto max-w-[200px]" />
                  </motion.div>

                  {/* Details List */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="w-full space-y-3"
                  >
                    <DetailRow icon={Hash} label="Kimlik No" value={shortId} mono />
                    <div className="h-px bg-border w-full" />
                    <DetailRow icon={Calendar} label="Kayıt Tarihi" value={joinDate} />
                    <div className="h-px bg-border w-full" />
                    <div className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Durum</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 text-sm font-medium">
                        <ShieldCheck className="w-4 h-4" />
                        Doğrulanmış Hesap
                      </div>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-[10px] text-muted-foreground max-w-xs leading-relaxed pt-2"
                  >
                    Bu QR kod etkinlik alanına giriş ve yoklama işlemleri için kullanılabilir.
                  </motion.div>

                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

function DetailRow({ icon: Icon, label, value, mono = false }: { icon: any, label: string, value: string, mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <span className={cn("text-foreground font-medium", mono && "font-mono tracking-wider")}>{value}</span>
    </div>
  );
}

// Change Log:
// - Added `as const` to the `transition` object to fix the TypeScript error regarding `AnimationGeneratorType`.