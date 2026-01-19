"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ApplicationFormTemplate } from "@/types/application";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Edit, FileText } from "lucide-react";

export default function AdminFormsPage() {
  const { data: forms = [], isLoading } = useQuery<ApplicationFormTemplate[]>({
    queryKey: ['admin-forms'],
    queryFn: async () => {
      const res = await fetch("/api/forms");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  if (isLoading) {
    return (
        <div className="space-y-6 p-4 max-w-5xl mx-auto">
            <Breadcrumbs items={[{ label: "Formlar" }]} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
      <Breadcrumbs items={[{ label: "Form Yönetimi" }]} />
      
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">Başvuru Formları</h2>
        <p className="text-muted-foreground mt-1">
          Sistemde aktif olan başvuru formlarını düzenleyin.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {forms.map((form) => (
            <Card key={form.id} className="group border-border/50 hover:border-primary/30 transition-all">
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                        <div className="p-3 rounded-lg bg-primary/10 text-primary mb-2">
                            <FileText className="w-6 h-6" />
                        </div>
                        <Badge variant="secondary" className="font-mono">{form.fee} ₺</Badge>
                    </div>
                    <CardTitle className="text-xl">{form.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{form.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-xs text-muted-foreground mb-4">
                        {form.steps.length} Adım • {form.steps.reduce((acc, s) => acc + s.fields.length, 0)} Soru
                    </div>
                    <Button asChild className="w-full" variant="outline">
                        <Link href={`/admin/forms/${form.id}`}>
                            <Edit className="w-4 h-4 mr-2" /> Düzenle
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
}

// Change Log:
// - New page to list application forms for admins.