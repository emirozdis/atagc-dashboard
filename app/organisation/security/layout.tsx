import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SECURITY_TEAM, UserRole } from "@/lib/roles";

export default async function SecurityLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;

    if (!role || !SECURITY_TEAM.includes(role as UserRole)) {
        redirect("/organisation");
    }

    return <>{children}</>;
}
