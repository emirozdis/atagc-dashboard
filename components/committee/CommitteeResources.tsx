"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Download, Archive, BookOpen, FileText, Info, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ResourceUploadDialog } from "@/components/admin/ResourceUploadDialog";

interface Resource {
  id: string;
  title: string;
  description: string;
  file_url: string;
  category: string;
  created_at: string;
  committee_id: string | null;
}

interface CommitteeResourcesProps {
    committeeId: string;
    isChairman: boolean;
}

export function CommitteeResources({ committeeId, isChairman }: CommitteeResourcesProps) {
    const queryClient = useQueryClient();
    const { data: resources = [], isLoading } = useQuery<Resource[]>({
        queryKey: ["resources", committeeId],
        queryFn: async () => {
            const res = await fetch(`/api/resources?committeeId=${committeeId}`);
            if (!res.ok) throw new Error("Failed to fetch resources");
            return res.json();
        }
    });

    const committeeResources = resources.filter(r => r.committee_id === committeeId);
    const generalResources = resources.filter(r => r.committee_id === null);

    const categories = [
        { id: "guide", label: "Working guides", icon: BookOpen },
        { id: "rules", label: "Procedures & rules", icon: FileText },
        { id: "general", label: "Other files", icon: Archive },
    ];

    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border/50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
                <Archive className="w-6 h-6 text-primary" />
            </div>
            <div>
                <h3 className="font-bold text-foreground">Committee resources</h3>
                <p className="text-xs text-muted-foreground">Required documents and working files.</p>
            </div>
          </div>
          {isChairman && (
            <ResourceUploadDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ["resources", committeeId] })} />
          )}
        </div>

        {resources.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
            <Info className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No resources have been uploaded for this committee yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Committee-specific resources */}
            {committeeResources.length > 0 && categories.map(cat => {
              const catResources = committeeResources.filter(r => r.category === cat.id);
              if (catResources.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-muted-foreground"><cat.icon className="w-4 h-4" /> {cat.label}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {catResources.map(res => <ResourceCard key={res.id} resource={res} />)}
                  </div>
                </div>
              );
            })}

            {/* General Resources */}
            {generalResources.length > 0 && (
              <div className="space-y-3 pt-6 border-t border-border/50">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-muted-foreground"><Globe className="w-4 h-4" /> General resources</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {generalResources.map(res => <ResourceCard key={res.id} resource={res} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
}

function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <Card className="bg-card/50 hover:bg-card border border-border/50 transition-colors group overflow-hidden">
      <CardHeader className="flex-row items-start gap-4 space-y-0 p-4">
        <div className="p-2 bg-secondary rounded-lg border border-border/50">
          <FileText className="w-5 h-5 text-secondary-foreground" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-base line-clamp-2 leading-tight" title={resource.title}>
            {resource.title}
          </CardTitle>
          <CardDescription className="text-xs mt-1">
            {new Date(resource.created_at).toLocaleDateString("en-GB")}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Button size="sm" asChild className="w-full h-9 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
            <Download className="w-4 h-4 mr-2" /> View / download
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
