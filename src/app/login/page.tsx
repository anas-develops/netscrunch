import { Metadata } from "next";
import LoginClient from "./loginClient";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage() {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return <LoginClient />;
}
