import { ProfileView } from "@/components/dashboard/ProfileView";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export default function AdminProfilePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Profil" }]} />
      <ProfileView />
    </div>
  );
}

// Change Log:
// - Added breadcrumbs and wrapper to the profile page.