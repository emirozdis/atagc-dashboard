"use client";

import { useSession } from "next-auth/react";
import { AdminSidebar } from "@/components/dashboard/AdminSidebar";
import { OrganisationSidebar } from "@/components/organisation/OrganisationSidebar";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { AdminMobileNav } from "@/components/dashboard/AdminMobileNav";
import { OrganisationMobileNav } from "@/components/organisation/OrganisationMobileNav";
import { RoleSyncer } from "@/components/dashboard/RoleSyncer";
import { ADMIN_ROLES, ORGANISATION_ROLES, ROLES, UserRole, getEffectiveRole } from "@/lib/roles";

export function AppLayout({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();

    // Determine effective role considering applicant targets
    const effectiveRole: UserRole = session?.user ? getEffectiveRole(session.user) : ROLES.APPLICANT;
    
    const isAdmin = ADMIN_ROLES.includes(effectiveRole);
    const isOrg = ORGANISATION_ROLES.includes(effectiveRole);

    return (
        <div className="flex h-[100dvh] w-full overflow-hidden bg-background relative">
            {/* Background elements */}
            <div className="fixed inset-0 -z-10 bg-background">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* 
                Desktop Sidebar 
                The CSS in globals.css now targets this container via .fixed.inset-y-0.left-0
            */}
            <div className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-50">
                {isAdmin ? <AdminSidebar /> : isOrg ? <OrganisationSidebar /> : <Sidebar />}
            </div>
            
            {/* Main Layout Area */}
            <div className="flex-1 flex flex-col md:pl-64 h-full relative z-0 min-w-0">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 pb-24 pb-safe md:pb-8">
                    {children}
                </main>
                {/* Mobile Navigation - Fixed at bottom, shouldn't be affected by top bar */}
                {isAdmin ? <AdminMobileNav /> : isOrg ? <OrganisationMobileNav /> : <MobileNav />}
            </div>
            
            <RoleSyncer />
        </div>
    );
}

/**
 * CHANGELOG:
 * - Added 'left-0' to the desktop sidebar fixed container to ensure it matches the CSS selector in globals.css for proper shifting.
 */
