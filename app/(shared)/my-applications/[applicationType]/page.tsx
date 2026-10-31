"use client";

import { use, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ApplicationDetailView, RavenApplicationDetail } from "@/components/raven/ApplicationDetailView";

type ApplicationsResponse = { applications: RavenApplicationDetail[] };

class UnauthorizedError extends Error {}

export default function ApplicationTypeDetailPage({ params }: { params: Promise<{ applicationType: string }> }) {
  const { applicationType } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data, isLoading, error } = useQuery<ApplicationsResponse>({
    queryKey: ["portal-applications", "detail"],
    retry: (failureCount, queryError) => !(queryError instanceof UnauthorizedError) && failureCount < 3,
    queryFn: async () => {
      const response = await fetch("/api/applications/mine");
      if (response.status === 401) throw new UnauthorizedError("Unauthorized");
      if (!response.ok) throw new Error("Unable to load your application.");
      return response.json();
    },
  });

  // A revoked or expired session passes the middleware (a token still exists),
  // so the API is the first place that reports it. Redirect to the custom
  // passwordless login instead of showing a dead-end error.
  useEffect(() => {
    if (!(error instanceof UnauthorizedError)) return;
    const callbackUrl = `${window.location.pathname}${window.location.search}`;
    router.replace(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }, [error, router]);

  const applicationId = searchParams.get("applicationId");
  const application = data?.applications?.find((item) => applicationId ? item.id === applicationId : item.application_type === applicationType);

  if (isLoading || error instanceof UnauthorizedError) return <div className="mx-auto max-w-5xl space-y-4 p-5 sm:p-8"><div className="h-8 w-56 animate-pulse rounded bg-white/10" /><div className="h-72 animate-pulse rounded-3xl bg-white/5" /></div>;
  if (error) return <div className="mx-auto max-w-5xl p-5 text-[#FDA4AF] sm:p-8">{error instanceof Error ? error.message : "Unable to load your application."}</div>;
  if (!application) return <div className="mx-auto max-w-5xl p-5 text-center text-[#9CA3AF] sm:p-8">Application not found.</div>;
  return <ApplicationDetailView application={application} />;
}
