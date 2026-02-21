import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OBSERVER_TEAM } from "@/lib/roles";

export default async function ObserversLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (!role || !OBSERVER_TEAM.includes(role as any)) {
    redirect("/organisation"); 
  }

  return <>{children}</>;
}