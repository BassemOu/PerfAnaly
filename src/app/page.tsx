import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next-auth";
import { DEV_BYPASS } from "@/lib/mock-session";

export default async function Home() {
  if (DEV_BYPASS) redirect("/dashboard");
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");
  redirect("/login");
}
