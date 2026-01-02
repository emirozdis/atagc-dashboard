import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { Fragment } from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center text-sm text-muted-foreground mb-4">
      <Link href="/admin" className="hover:text-foreground transition-colors">
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
            <span className="text-foreground font-semibold">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}