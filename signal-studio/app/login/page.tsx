import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import Login from "@/components/login";
export const dynamic = "force-dynamic";
export default async function LoginPage() {
  if (await getUserId()) redirect("/");
  return <Login />;
}
