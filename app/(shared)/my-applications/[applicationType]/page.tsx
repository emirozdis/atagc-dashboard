"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ApplicationDetailView, RavenApplicationDetail } from "@/components/raven/ApplicationDetailView";

type ApplicationsResponse = { applications: RavenApplicationDetail[] };

export default function ApplicationTypeDetailPage({ params }: { params: Promise<{ applicationType: string }> }) {
  const { applicationType } = use(params);
  const searchParams = useSearchParams();
  const { data, isLoading, error } = useQuery<ApplicationsResponse>({
    queryKey: ["portal-applications", "detail"],
    queryFn: async () => {
      const response = await fetch("/api/applications/mine");
      if (!response.ok) throw new Error("Unable to load your application.");
      return response.json();
    },
  });
  const applicationId = searchParams.get("applicationId");
  const application = data?.applications?.find((item) => applicationId ? item.id === applicationId : item.application_type === applicationType);

  if (isLoading) return <div className="mx-auto max-w-5xl space-y-4 p-5 sm:p-8"><div className="h-8 w-56 animate-pulse rounded bg-white/10" /><div className="h-72 animate-pulse rounded-3xl bg-white/5" /></div>;
  if (error) return <div className="mx-auto max-w-5xl p-5 text-[#FDA4AF] sm:p-8">{error instanceof Error ? error.message : "Unable to load your application."}</div>;
  if (!application) return <div className="mx-auto max-w-5xl p-5 text-center text-[#9CA3AF] sm:p-8">Application not found.</div>;
  return <ApplicationDetailView application={application} />;
}
