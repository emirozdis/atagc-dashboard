"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Committee } from "@/types/admin";
import { CardSkeleton } from "@/components/ui/skeleton-loader";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDocumentsPage() {
  const router = useRouter();

  const { data: committees = [], isLoading } = useQuery<Committee[]>({
    queryKey: ['committees'],
    queryFn: async () => {
      const res = await fetch("/api/admin/committees");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const handleOpenDocument = (committeeId: string) => {
    router.push(`/dashboard/editor?committeeId=${committeeId}`);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-5 pb-12 animate-fade-in sm:p-8">
        <Skeleton className="h-4 w-32" /> {/* Breadcrumbs */}
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <CardSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 pb-12 animate-fade-in sm:p-8">
      <h2 className="text-3xl font-display font-bold text-foreground">Committee documents</h2>
      <p className="text-muted-foreground">
        Choose a committee document to view or edit.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {committees.map((committee) => (
          <Card key={committee.id} className="bg-card border-border/50 hover:bg-accent/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {committee.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {committee.description}
              </p>
              <Button
                onClick={() => handleOpenDocument(committee.id)}
                className="w-full"
                variant="secondary"
              >
                Open document <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
