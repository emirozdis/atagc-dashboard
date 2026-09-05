import { notFound } from "next/navigation";
import type { Metadata } from "next";
import RavenApplicationForm from "@/components/raven/RavenApplicationForm";
import { PUBLIC_APPLICATION_TYPES, ApplicationType } from "@/lib/roles";
import { supabase } from "@/lib/SERVER_supabase";
import { RAVENMUN_APPLICATION_CARDS } from "@/config/ravenmun";
import { getRavenmunOgImageUrl, RAVENMUN_APPLY_DESCRIPTION, RAVENMUN_OG_IMAGE } from "@/lib/raven-metadata";
import { getSiteUrl } from "@/lib/site-url";

// The form definition and published committee list are public conference data.
// Pre-render each application type and refresh it periodically when admins edit
// the form. User drafts, verification, and submission remain client/API work.
export const dynamic = "force-static";
export const revalidate = 300;
export const dynamicParams = false;

const NO_PREFERENCE_OPTION = { value: "no-preference", label: "No preference - assign me where needed" };
const ogImageUrl = getRavenmunOgImageUrl(getSiteUrl());

export function generateStaticParams() {
  return PUBLIC_APPLICATION_TYPES.map((applicationType) => ({ applicationType }));
}

export async function generateMetadata({ params }: { params: Promise<{ applicationType: string }> }): Promise<Metadata> {
  const { applicationType } = await params;
  const card = RAVENMUN_APPLICATION_CARDS.find((item) => item.type === applicationType);
  const title = card ? `Apply - ${card.title}` : "Apply";
  const socialTitle = card ? `Apply ${card.title}` : "Apply";
  const description = card
    ? `Apply as a ${card.title.toLowerCase()} to be a part of RAVENMUN'26.`
    : RAVENMUN_APPLY_DESCRIPTION;
  return {
    title,
    description,
    alternates: { canonical: `/apply/${applicationType}` },
    openGraph: {
      title: `${socialTitle} | RAVENMUN'26`,
      description,
      url: `/apply/${applicationType}`,
      images: [{ url: ogImageUrl, width: RAVENMUN_OG_IMAGE.width, height: RAVENMUN_OG_IMAGE.height, alt: RAVENMUN_OG_IMAGE.alt }],
    },
    twitter: { card: "summary_large_image", title: `${socialTitle} | RAVENMUN'26`, description, images: [ogImageUrl] },
  };
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
