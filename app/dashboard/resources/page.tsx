"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Download, Info, FileText, BookOpen, Globe, Building2, Calendar, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";
import { ResourceUploadDialog } from "@/components/admin/ResourceUploadDialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface Resource {
  id: string;
  title: string;
  description: string;
  file_url: string;
  category: string;
  created_at: string;
  committee_id: string | null;
}

const categoryConfig = {
  guide: { label: "Çalışma Kılavuzları", icon: BookOpen },
  rules: { label: "Prosedürler & Kurallar", icon: FileText },
  schedule: { label: "Etkinlik Programı", icon: Calendar },
  general: { label: "Genel Dosyalar", icon: Archive },
  award: { label: "Ödül Kriterleri", icon: Archive },
};

function ResourceCard({ resource }: { resource: Resource }) {
  const fileExtension = resource.file_url.split('.').pop()?.toUpperCase() || 'FILE';
  
  return (
    <Card className="group relative overflow-hidden border border-border/40 bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardHeader className="relative pb-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold leading-tight line-clamp-2 mb-1.5" title={resource.title}>
              {resource.title}
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <time dateTime={resource.created_at}>
                {new Date(resource.created_at).toLocaleDateString("tr-TR", { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </time>
              <span className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-medium ml-auto">
                {fileExtension}
              </span>
            </div>
          </div>
        </div>
        {resource.description && (
          <CardDescription className="text-sm line-clamp-2 mt-2">
            {resource.description}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="relative pt-0">
        <Button 
          size="sm" 
          asChild 
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all"
        >
          <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
            <Download className="w-4 h-4 mr-2" /> 
            Görüntüle / İndir
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function ResourceSection({ 
  title, 
  icon: Icon, 
  resources, 
  badge 
}: { 
  title: string;
  icon: React.ElementType;
  resources: Resource[];
  badge?: string;
}) {
  if (resources.length === 0) return null;
  
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3 pb-2 border-b border-border/50">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h3 className="font-semibold text-xl text-foreground flex-1">
          {title}
        </h3>
        {badge && (
          <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
            {badge}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {resources.map(res => <ResourceCard key={res.id} resource={res} />)}
      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-96" />
      </div>
      
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
      
      <div className="space-y-6">
        <Skeleton className="h-12 w-56" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ParticipantResourcesPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: resources = [], isLoading } = useQuery<Resource[]>({
    queryKey: ["resources-participant"],
    queryFn: async () => {
      const res = await fetch("/api/resources");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const isChairman = session?.user?.role === "committee_chairman";

  const filteredResources = resources.filter(resource => 
    searchQuery === "" || 
    resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    resource.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const committeeResources = filteredResources.filter(r => r.committee_id);
  const generalResources = filteredResources.filter(r => !r.committee_id);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Section */}
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-foreground tracking-tight">
                Kaynaklar
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Etkinlik süresince ihtiyaç duyacağınız tüm dokümanlar ve materyaller
              </p>
            </div>
            
            {isChairman && (
              <ResourceUploadDialog 
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ["resources-participant"] })} 
              />
            )}
          </div>

          {/* Search Bar */}
          {resources.length > 0 && (
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Kaynak ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-card border-border/50 focus:border-primary"
              />
            </div>
          )}
        </div>

        {/* Content */}
        {resources.length === 0 ? (
          <Card className="border-2 border-dashed border-border/50 bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Info className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Henüz Kaynak Yok</h3>
              <p className="text-muted-foreground max-w-md">
                Henüz bir kaynak yüklenmedi. Kaynaklar yüklendiğinde burada görünecektir.
              </p>
            </CardContent>
          </Card>
        ) : filteredResources.length === 0 ? (
          <Card className="border border-border/50 bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-12 h-12 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold mb-1">Sonuç Bulunamadı</h3>
              <p className="text-muted-foreground">
                Aramanızla eşleşen kaynak bulunamadı. Farklı bir terim deneyin.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-12">
            <ResourceSection 
              title="Komite Kaynakları" 
              icon={Building2} 
              resources={committeeResources}
              badge={committeeResources.length > 0 ? `${committeeResources.length}` : undefined}
            />
            
            <ResourceSection 
              title="Genel Kaynaklar" 
              icon={Globe} 
              resources={generalResources}
              badge={generalResources.length > 0 ? `${generalResources.length}` : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}