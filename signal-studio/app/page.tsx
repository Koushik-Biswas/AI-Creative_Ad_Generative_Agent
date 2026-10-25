import { redirect } from "next/navigation";
import Studio from "@/components/studio";
import { getUserId } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function Home() {
  if (!(await getUserId())) redirect("/login");
  return <Studio />;
}
