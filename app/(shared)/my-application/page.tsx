import { redirect } from "next/navigation";

export default function LegacyMyApplicationPage() {
  redirect("/portal/applications");
}
