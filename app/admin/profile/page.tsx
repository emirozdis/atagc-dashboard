import { ProfileView } from "@/components/dashboard/ProfileView";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export default function AdminProfilePage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <Breadcrumbs items={[{ label: "Profil" }]} />
      <ProfileView />
    </div>
  );
}