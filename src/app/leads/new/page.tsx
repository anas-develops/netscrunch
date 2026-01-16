import { createClient } from "@/lib/supabase/server";
import NewLeadForm from "./newLeadForm";

export default async function NewLeadPage({
  searchParams,
}: {
  searchParams: {
    prospect_id: string;
  };
}) {
  const routeSearchParams = await searchParams;
  const { prospect_id } = routeSearchParams;

  const supabaseClient = await createClient();

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  const { data: prospect } = !!prospect_id
    ? await supabaseClient
        .from("prospects")
        .select()
        .eq("id", prospect_id)
        .eq("owner_id", user?.id)
        .single()
    : { data: null };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Create New Lead</h1>
      {prospect && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-md">
          <p className="text-blue-800">
            <span className="font-semibold">Linked Prospect:</span> {prospect.name} ({prospect.email})
          </p>
        </div>
      )}
      <NewLeadForm prospect={prospect} />
    </div>
  );
}
