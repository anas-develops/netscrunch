import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import EditProspectForm from "./editProspectForm";

export default async function EditProspectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabaseClient = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) redirect("/login");

  // Fetch the prospect by ID
  const { data: prospect, error } = await supabaseClient
    .from("prospects")
    .select(
      `
      *,
      tagged_icp:tagged_icp_id(*),
      owner:owner_id(*)
    `
    )
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (error || !prospect) {
    console.error("Error fetching prospect:", error);
    redirect("/prospects"); // Redirect to prospects list if not found
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Edit Prospect</h1>
      <EditProspectForm prospect={prospect} />
    </div>
  );
}
