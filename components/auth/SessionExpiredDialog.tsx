"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";

export function SessionExpiredDialog() {
    const { status } = useSession();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const isProtectedRoute = 
            pathname?.startsWith("/dashboard") || 
            pathname?.startsWith("/admin") || 
            pathname?.startsWith("/organisation") ||
            pathname?.startsWith("/profile");

        // If status is unauthenticated but we are on a protected route, it implies session died mid-usage
        if (status === "unauthenticated" && isProtectedRoute) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [status, pathname]);

    const handleLogin = () => {
        // Force a full sign out client side to clear any stale cookies/state, then redirect to login
        signOut({ callbackUrl: "/login" });
    };

    return (
        <AlertDialog open={isOpen}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader className="space-y-4">
                    <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 ring-4 ring-red-100/50 dark:ring-red-900/20">
                        <LogOut className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>

                    <AlertDialogTitle className="text-center text-2xl font-semibold tracking-tight">
                        Oturum Sonlandı
                    </AlertDialogTitle>

                    <AlertDialogDescription className="text-center space-y-4">
                        <p className="text-base leading-relaxed text-muted-foreground">
                            Güvenlik nedeniyle oturumunuz sonlandırıldı.
                        </p>

                        <div className="bg-muted/50 rounded-lg p-4 space-y-2.5 text-left">
                            <div className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                                <p className="text-sm text-foreground/80 leading-relaxed">
                                    Başka bir cihazdan çıkış yapıldı
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                                <p className="text-sm text-foreground/80 leading-relaxed">
                                    Şifreniz değiştirildi
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                                <p className="text-sm text-foreground/80 leading-relaxed">
                                    Hesabınız askıya alındı
                                </p>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-border/50">
                            <p className="text-sm font-medium text-foreground">
                                Devam etmek için lütfen tekrar giriş yapınız
                            </p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter className="mt-2">
                    <AlertDialogAction
                        onClick={handleLogin}
                        className="w-full sm:w-auto font-medium"
                    >
                        Giriş Yap
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}