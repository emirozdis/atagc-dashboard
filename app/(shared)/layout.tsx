import { AppLayout } from "@/components/layout/AppLayout";

export default function SharedLayout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}