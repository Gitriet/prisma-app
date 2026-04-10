import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TodayClient from "./TodayClient";

export default async function TodayPage() {
  const session = await auth().catch(() => null);
  if (!session) redirect("/login");
  return <TodayClient userId={session.user!.id!} />;
}
