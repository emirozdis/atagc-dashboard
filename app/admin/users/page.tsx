"use client";

import { useState } from "react";
import {
  Users as UsersIcon,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { UserSelectionTable } from "@/components/admin/UserSelectionTable";
import { Card, CardContent } from "@/components/ui/card";

export default function UsersPage() {
  const breadcrumbItems = [
    { label: "Kullanıcılar" }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={breadcrumbItems} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <UsersIcon className="w-8 h-8 text-primary" />
            Kullanıcı Yönetimi
          </h2>
          <p className="text-muted-foreground mt-1">
            Toplu işlemler ve detaylı kullanıcı yönetimi.
          </p>
        </div>
      </div>

      <Card className="bg-card border-border/50">
        <CardContent className="p-6">
           {/* Removing props enables internal state management for batch actions */}
           <UserSelectionTable />
        </CardContent>
      </Card>
    </div>
  );
}