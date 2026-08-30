"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar, CheckCircle2, Clock, Info, MapPin,
  XCircle, FileQuestion, Users,
  ChevronRight, AlertTriangle, ShieldCheck, UserPlus,
  ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DigitalIdCard } from "@/components/dashboard/DigitalIdCard";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { TopicCard } from "@/components/committee/TopicCard";
import { Button } from "@/components/ui/button";
import { PaymentStatusEnum } from "@/types/payment";
import { ApplicationStatusEnum } from "@/types/application";
import { ParticipantDashboardProps, ProfileData, SystemSettings } from "@/types/dashboard";
import { ROLE_METADATA, UserRole } from "@/lib/roles";

export function ParticipantDashboard({ user }: ParticipantDashboardProps) {
  const { data: profile, isLoading: profileLoading } = useQuery<ProfileData>({
    queryKey: ['participant-me'],
    queryFn: async () => {
      const res = await fetch("/api/participant/me");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const { data: settings, isLoading: settingsLoading } = useQuery<SystemSettings>({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  // Fetch delegation summary for leaders
  const { data: delegationInfo, isLoading: delegationLoading } = useQuery({
    queryKey: ["delegation-dashboard-summary"],
    queryFn: async () => {
        const res = await fetch("/api/delegation/list_delegation_members");
        if (!res.ok) return null;
        return res.json();
    }
  });

  const { profile: userProfile, application, committee } = profile || {};
  const appStatus = application?.status || "pending";

  const { data: paymentData, isLoading: paymentLoading } = useQuery({
    queryKey: ['payment-status-dashboard'],
    queryFn: async () => {
      const res = await fetch("/api/payment/status");
      if (res.status === 403 || res.status === 401) {
        return { payment_status: "unpaid" };
      }
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: appStatus === ApplicationStatusEnum.APPROVED // Only fetch payment if approved
  });

  // Calculate loading status accurately based on enabled queries
  const isLoading = profileLoading || (appStatus === ApplicationStatusEnum.APPROVED ? paymentLoading : false) || delegationLoading;

  const topic = committee?.topic;
  const paymentStatus = paymentData?.payment_status || PaymentStatusEnum.UNPAID;

  const isPaymentComplete = paymentStatus === PaymentStatusEnum.PAID || paymentStatus === PaymentStatusEnum.EXEMPT;
  const showIdCard = userProfile && (userProfile.role !== 'applicant' || (appStatus === ApplicationStatusEnum.APPROVED && isPaymentComplete));

  const isDelegationLeader = delegationInfo?.is_leader;
  const delegationMemberCount = delegationInfo?.data?.length || 0;

  if (!isLoading && !application && userProfile?.role === 'applicant') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in py-12">
        <div className="w-24 h-24 rounded-full bg-secondary/30 flex items-center justify-center shadow-inner ring-1 ring-white/10">
          <FileQuestion className="w-10 h-10 text-muted-foreground/70" />
        </div>
        <div className="space-y-4 max-w-md mx-auto px-4">
          <div>
            <h2 className="text-3xl font-bold font-display text-foreground tracking-tight">No application found</h2>
            <p className="text-muted-foreground leading-relaxed mt-2">
              There is no active application associated with your account. Apply to participate in the conference.
            </p>
          </div>
          <Button asChild size="lg" className="w-full sm:w-auto min-w-[200px] shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
            <Link href="/">
              Apply <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const appliedRoleSlug = application?.form?.slug;
  // Fallback for delegation slug which might not be in ROLE_METADATA keys directly
  let appliedRoleLabel = "Participant";
  
  if (appliedRoleSlug) {
      if (appliedRoleSlug === 'delegation') appliedRoleLabel = "Delegation";
      else if (ROLE_METADATA[appliedRoleSlug as UserRole]) appliedRoleLabel = ROLE_METADATA[appliedRoleSlug as UserRole].label;
      else appliedRoleLabel = "Application";
  }

  const getStatusSteps = () => {
    return [
      {
        id: 'application',
        label: "Application",
        status: appStatus === 'approved' ? 'done' : appStatus === 'rejected' ? 'error' : 'processing',
        date: application?.submitted_at,
        text: appStatus === 'approved' 
                ? "Approved"
                : appStatus === 'rejected' 
                  ? `${appliedRoleLabel} rejected`
                  : `${appliedRoleLabel} under review`
      },
      {
        id: 'payment',
        label: "Payment",
        status: appStatus !== 'approved' ? 'waiting' :
          paymentStatus === PaymentStatusEnum.PAID ? 'done' :
            paymentStatus === PaymentStatusEnum.EXEMPT ? 'exempt' :
              paymentStatus === PaymentStatusEnum.PROCESSING ? 'processing' :
                paymentStatus === PaymentStatusEnum.REJECTED ? 'error' : 'pending',
        date: paymentData?.last_receipt?.created_at,
        text: paymentStatus === PaymentStatusEnum.EXEMPT ? "Exempt" : undefined
      },
      {
        id: 'committee',
        label: "Assignment",
        status: committee ? 'done' : 'waiting',
        text: committee?.name
      }
    ];
  };

  const steps = getStatusSteps();

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'exempt': return <ShieldCheck className="w-5 h-5 text-purple-500" />;
      case 'processing': return <Clock className="w-5 h-5 text-amber-500 animate-pulse" />;
      case 'pending': return <AlertTriangle className="w-5 h-5 text-primary" />;
      default: return <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />;
    }
  };

  const formatDateRange = (start: string | null | undefined, end: string | null | undefined) => {
    if (!start) return "Date not set";
    try {
      const startDate = new Date(start);
      const endDate = end ? new Date(end) : null;
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

      if (endDate) {
        if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
          return `${startDate.getDate()} - ${endDate.getDate()} ${startDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
        }
        return `${startDate.toLocaleDateString('en-GB', options)} - ${endDate.toLocaleDateString('en-GB', options)}`;
      }
      return startDate.toLocaleDateString('en-GB', options);
    } catch (e) {
      return "Invalid date format";
    }
  };

  // Ensure Digital ID displays the default applicant role when the application is not approved.
  const userForDigitalId = userProfile ? {
      id: userProfile.id,
      full_name: userProfile.full_name,
      role: userProfile.role,
      created_at: userProfile.created_at
  } : undefined;

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">
            Hello, <span className="text-primary">{user?.name?.split(" ")[0]}</span>
          </h2>
          <p className="text-muted-foreground mt-2 text-lg">
            Track your registration progress here.
          </p>
        </div>
        {settingsLoading ? (
          <Skeleton className="h-8 w-32 rounded-full" />
        ) : settings?.term_name && (
          <Badge variant="outline" className="w-fit px-3 py-1.5 text-xs font-medium uppercase tracking-wider bg-secondary/50">
            {settings.term_name}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className={cn("flex flex-col gap-6", (showIdCard || isLoading) ? "lg:col-span-2" : "lg:col-span-3")}>
          <Card className="border-border/50 shadow-sm bg-card overflow-hidden hover:border-primary/30 transition-all duration-300">
            <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" /> Registration status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 md:p-6">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-5 h-5 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-16" />
                    </div>
                  ))
                ) : (
                  steps.map((step, idx) => (
                    <div key={step.id} className="flex items-center justify-between p-4 md:p-6 transition-colors hover:bg-muted/5 group">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center gap-1">
                          {getStepIcon(step.status)}
                          {idx < steps.length - 1 && (
                            <div className={cn("w-px h-6 my-1", (step.status === 'done' || step.status === 'exempt') ? "bg-emerald-500/30" : "bg-border")} />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm md:text-base group-hover:text-primary transition-colors">{step.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {step.text || (
                              step.status === 'done' ? "Complete" :
                              step.status === 'exempt' ? "Not applicable (complete)" :
                              step.status === 'processing' ? "In review" :
                              step.status === 'error' ? "Action required" :
                              step.status === 'pending' ? "Pending" :
                              "Waiting"
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {step.date && (
                          <span className="text-[10px] text-muted-foreground hidden sm:inline-block bg-secondary/30 px-2 py-1 rounded">
                            {new Date(step.date).toLocaleDateString("en-GB")}
                          </span>
                        )}

                        {step.id === 'payment' && (step.status === 'pending' || step.status === 'error') && (
                          <Button size="sm" asChild className={cn("h-8 text-xs shadow-sm", step.status === 'error' && "bg-red-600 hover:bg-red-700")}>
                            <Link href="/payment" prefetch={false}>
                              {step.status === 'error' ? "Fix" : "Pay"} <ChevronRight className="w-3 h-3 ml-1" />
                            </Link>
                          </Button>
                        )}
                        {step.id === 'payment' && (step.status === 'processing' || step.status === 'exempt') && (
                          <Button size="sm" variant="outline" asChild className="h-8 text-xs hover:bg-muted/50">
                            <Link href="/payment" prefetch={false}>Details</Link>
                          </Button>
                        )}
                        {step.id === 'committee' && step.status === 'done' && (
                          <Button size="sm" variant="outline" asChild className="h-8 text-xs hover:bg-muted/50">
                            <Link href="/dashboard/committee" prefetch={false}>
                              Git <ChevronRight className="w-3 h-3 ml-1" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delegation Leader Widget */}
          {isDelegationLeader && (
            <Card className="border-border/50 shadow-sm bg-card overflow-hidden hover:border-primary/30 transition-all duration-300">
                <CardHeader className="bg-muted/10 border-b border-border/50 pb-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" /> Delegation management
                    </CardTitle>
                    <Button size="sm" variant="ghost" asChild className="h-8 text-xs hover:bg-primary/5 text-muted-foreground hover:text-primary">
                        <Link href="/dashboard/delegation">View all</Link>
                    </Button>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                        <div className="space-y-1">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Total members</span>
                            <div className="text-3xl font-bold font-display text-foreground">{delegationMemberCount}</div>
                            <p className="text-xs text-muted-foreground">Registered participants in your delegation.</p>
                        </div>
                        <div className="flex flex-col gap-3 justify-center">
                            <Button asChild className="w-full bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 border shadow-none transition-all">
                                <Link href="/dashboard/delegation?tab=invites">
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Add / invite member
                                </Link>
                            </Button>
                        </div>
                    </div>
                    {delegationMemberCount <= 1 && (
                        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-900 dark:text-amber-200">
                                <span className="font-semibold block mb-0.5">You have not added any delegates yet</span>
                                Add delegates from the delegation page to complete your team.
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
          )}

          {/* Delegation Membership Status (For Non-Leaders or Members) */}
          {userProfile?.delegation && !isDelegationLeader && (
            <Card className="border-border/50 shadow-sm bg-card overflow-hidden hover:border-primary/20 transition-all">
              <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Delegation status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Delegation:</span>
                    <span className="font-medium">{userProfile.delegation.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Participation status:</span>
                    {userProfile.delegation.accepted === true ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Approved</Badge>
                    ) : userProfile.delegation.accepted === false ? (
                      <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-border/50 shadow-sm flex flex-col flex-1 hover:border-primary/20 transition-all">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Conference details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              {settingsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-2.5 rounded-lg bg-secondary/20 border border-border/50 hover:bg-secondary/30 transition-colors">
                    <Calendar className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-foreground">Date</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateRange(settings?.event_start_date, settings?.event_end_date)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-lg bg-secondary/20 border border-border/50 hover:bg-secondary/30 transition-colors">
                    <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-foreground">Location</div>
                      <div className="text-xs text-muted-foreground">
                        {settings?.location || "Location not set"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {showIdCard && (
            <div className="lg:col-span-1 h-full min-h-[400px]">
                <DigitalIdCard
                user={userForDigitalId}
                className="h-full hover:shadow-lg transition-shadow duration-300 border-border/50"
                uniqueId="dashboard"
                isLoading={isLoading}
                />
            </div>
        )}
      </div>

      {(isLoading || appStatus === ApplicationStatusEnum.APPROVED) && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/50"></div>
            <h3 className="text-lg font-display font-semibold text-muted-foreground tracking-widest text-sm">COMMITTEE & WORK</h3>
            <div className="h-px flex-1 bg-border/50"></div>
          </div>

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2">
              <TopicCard isLoading={true} />
              <Card className="bg-card border-border/50 shadow-sm flex flex-col h-full min-h-[250px]">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-9 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-3 flex-grow">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-9 w-full mt-auto" />
                </CardContent>
              </Card>
            </div>
          ) : committee ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="group relative overflow-hidden bg-card border-border/50 shadow-sm flex flex-col h-full min-h-[250px] transition-all hover:shadow-md hover:border-primary/20">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />

                <CardHeader className="pb-4 relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase shadow-sm">
                      <Users className="w-3.5 h-3.5" />
                      Committee information
                    </div>
                  </div>
                  <CardTitle className="text-2xl md:text-3xl font-display font-bold leading-tight text-foreground tracking-tight">
                    {committee.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex-grow relative z-10 flex flex-col justify-between space-y-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed text-base">
                    {committee.description || "No description available."}
                  </div>
                  <Button variant="outline" size="sm" asChild className="w-full mt-auto hover:bg-primary/5 hover:text-primary transition-colors">
                    <Link href="/dashboard/committee" prefetch={false} className="flex items-center gap-2">
                      Open committee page <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <TopicCard topic={topic} />
            </div>
          ) : (
            <Card className="bg-secondary/10 border-dashed border-border/60 hover:bg-secondary/20 transition-colors">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center mb-5 animate-pulse">
                  <Users className="w-7 h-7 text-muted-foreground" />
                </div>
                <h4 className="font-semibold text-xl text-foreground mb-2">Waiting for committee assignment</h4>
                <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Your application has been approved, but you have not been placed in a committee yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
