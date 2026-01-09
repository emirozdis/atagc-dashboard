import { ProfileView } from "@/components/dashboard/ProfileView";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Profil" }]} />
      <ProfileView />
    </div>
  );
}

// Change Log:
// - Refactored to use shared ProfileView component to ensure privacy settings are available.