// app/tasks/new/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TaskForm } from "./taskForm";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: { leadId?: string; dealId?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch user profile (for department, name)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, department")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  // Optional: Prefetch lead/deal for breadcrumb
  let linkedEntity = null;
  if (searchParams.leadId) {
    const { data: lead } = await supabase
      .from("leads")
      .select("id, name, company")
      .eq("id", searchParams.leadId)
      .single();
    linkedEntity = { type: "lead" as const, ...lead };
  } else if (searchParams.dealId) {
    const { data: deal } = await supabase
      .from("deals")
      .select("id, name")
      .eq("id", searchParams.dealId)
      .single();
    linkedEntity = { type: "deal" as const, ...deal };
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        {linkedEntity ? `New Task for ${linkedEntity.name}` : "New Task"}
      </h1>
      <TaskForm
        userId={user.id}
        leadId={searchParams.leadId}
        dealId={searchParams.dealId}
      />
    </div>
  );
}
