import { ProfileView } from "@/components/dashboard/ProfileView";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export default function OrganisationProfilePage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <Breadcrumbs items={[{ label: "Organizasyon", href: "/organisation" }, { label: "Profil" }]} />
      <ProfileView />
    </div>
  );
}