import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const session = await auth().catch(() => null);
  if (!session) redirect("/login");
  return <ProfileClient />;
}
