import { redirect } from "next/navigation";

export default function HomeClientRedirectPage() {
  redirect("/login");
}
