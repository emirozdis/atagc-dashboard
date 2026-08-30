"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApplicationFormTemplate } from "@/types/application";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Edit, FileText } from "lucide-react";

export default function AdminFormsPage() {
  const { data: forms = [], isLoading } = useQuery<ApplicationFormTemplate[]>({
    queryKey: ["admin-forms"],
    queryFn: async () => {
      const res = await fetch("/api/forms");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 pb-12 animate-fade-in sm:p-8">

      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">
          Application forms
        </h2>
        <p className="text-muted-foreground mt-1">
          Manage the application forms shown to participants.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? [1, 2, 3].map(i => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))
          : forms.map(form => (
              <Card
                key={form.id}
                className="group border-border/50 hover:border-primary/30 transition-all"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="p-3 rounded-lg bg-primary/10 text-primary mb-2">
                      <FileText className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle className="text-xl">{form.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {form.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-4">
                    {form.questions?.length || form.steps.reduce((acc, step) => acc + step.fields.length, 0)} questions
                  </div>
                  <Button asChild className="w-full" variant="outline">
                    <Link href={`/admin/forms/${form.id}`}>
                      <Edit className="w-4 h-4 mr-2" /> Edit
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
