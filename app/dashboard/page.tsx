import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ParticipantDashboard } from "@/app/dashboard/ParticipantDasboard";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // NOTE: Admins can access this page to see "What a participant sees".
  // They are not blocked here, but the content is purely participant-focused.
  // To go back to Admin Panel, they will use the Sidebar switch.

  return <ParticipantDashboard user={session.user} />;
}

// Change Log:
// - Removed all Admin logic.
// - This route (/dashboard) is now strictly the "User/Participant" view.