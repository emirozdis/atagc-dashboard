import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ParticipantDashboard } from "@/app/dashboard/ParticipantDasboard";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <Breadcrumbs items={[{ label: "Panel" }]} />
      <ParticipantDashboard user={session.user} />
    </div>
  );
}