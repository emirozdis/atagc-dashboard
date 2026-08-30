import { notFound } from "next/navigation";
import RavenApplicationForm from "@/components/raven/RavenApplicationForm";
import { PUBLIC_APPLICATION_TYPES, ApplicationType } from "@/lib/roles";
import { supabase } from "@/lib/SERVER_supabase";

export const revalidate = 300;
export const dynamicParams = false;

const NO_PREFERENCE_OPTION = { value: "no-preference", label: "No preference - assign me where needed" };

export function generateStaticParams() {
  return PUBLIC_APPLICATION_TYPES.map((applicationType) => ({ applicationType }));
}

async function getPublicApplicationForm(applicationType: ApplicationType) {
  const [{ data: form, error }, { data: committees }] = await Promise.all([
    supabase.from("application_forms").select("title, questions").eq("application_type", applicationType).eq("is_active", true).maybeSingle(),
    supabase.from("committees").select("id, slug, name").eq("is_published", true).order("name"),
  ]);
  if (error || !form) return null;
  const committeeOptions = Array.isArray(committees) && committees.length > 0
    ? committees.filter((committee) => committee?.id && committee?.name).map((committee) => ({ value: committee.slug || committee.id, label: committee.name }))
    : [NO_PREFERENCE_OPTION];
  return { title: form.title, questions: Array.isArray(form.questions) ? form.questions : [], committeeOptions };
}

export default async function ApplicationTypePage({ params }: { params: Promise<{ applicationType: string }> }) {
  const { applicationType: rawApplicationType } = await params;
  if (!PUBLIC_APPLICATION_TYPES.includes(rawApplicationType as ApplicationType)) notFound();
  const applicationType = rawApplicationType as ApplicationType;
  const form = await getPublicApplicationForm(applicationType);
  if (!form) notFound();
  return <RavenApplicationForm applicationType={applicationType} initialForm={form} />;
}
