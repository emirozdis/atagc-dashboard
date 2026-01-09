"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { Fragment } from "react";
import { usePathname } from "next/navigation";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");
  const homeHref = isDashboard ? "/dashboard" : "/admin";

  return (
    <nav className="flex items-center text-sm text-muted-foreground mb-4">
      <Link href={homeHref} className="hover:text-foreground transition-colors">
        <Home className="w-4 h-4" />
      </Link>
      {items.map((item, index) => (
        <Fragment key={index}>
          <ChevronRight className="w-4 h-4 mx-2 opacity-50" />
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors font-medium">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-semibold text-xs md:text-sm">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}