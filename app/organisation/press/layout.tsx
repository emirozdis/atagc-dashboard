import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PRESS_TEAM, UserRole } from "@/lib/roles";

export default async function PressLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;

    if (!role || !PRESS_TEAM.includes(role as UserRole)) {
        redirect("/organisation");
    }

    return <>{children}</>;
}
