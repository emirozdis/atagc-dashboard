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
    // Added flex-wrap and min-w-0 to prevent horizontal overflow on long paths
    <nav className="flex flex-wrap items-center text-sm text-muted-foreground mb-4 min-w-0">
      <Link href={homeHref} className="hover:text-foreground transition-colors shrink-0">
        <Home className="w-4 h-4" />
      </Link>
      {items.map((item, index) => (
        <Fragment key={index}>
          <ChevronRight className="w-4 h-4 mx-2 opacity-50 shrink-0" />
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors font-medium truncate">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-semibold text-xs md:text-sm truncate">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}