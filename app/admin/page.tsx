import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const session = await auth().catch(() => null);
  const user = session?.user as ({ isAdmin?: boolean } & { name?: string | null; email?: string | null }) | undefined;

  if (!user?.isAdmin) {
    redirect("/");
  }

  return <AdminClient />;
}
