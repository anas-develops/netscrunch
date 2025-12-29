import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Deal, Task } from "../types";
import { TasksAndActivityLog } from "./tasksAndActivityLog";
import { ActivityTimeline } from "@/app/common/activityTimeline";

export default async function ViewDealPage({
  params,
}: {
  params: { id: string };
}) {
  const routeParams = await params;
  const dealId = routeParams.id;
  const supabase = await createClient();

  // Fetch deal with linked lead + owner
  const { data: deal }: { data: Deal | null } = await supabase
    .from("deals")
    .select(
      `
      id,
      name,
      value,
      close_date,
      stage,
      notes,
      lead_id,
      owner_id(full_name),
      lead:leads!lead_id (id, name, company, source)
    `
    )
    .eq("id", dealId)
    .single();

  if (!deal) notFound();

  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      "id, type, description, due_date, completed, created_at, lead:lead_id(id, name, company, source), deal:deal_id(id, owner_name, lead_name, lead_company),owner:owner_id(full_name)"
    )
    .eq("deal_id", deal.id);

  const stageColors: Record<string, string> = {
    Prospecting: "bg-gray-100 text-gray-800",
    Qualification: "bg-blue-100 text-blue-800",
    Proposal: "bg-purple-100 text-purple-800",
    Negotiation: "bg-orange-100 text-orange-800",
    Won: "bg-green-100 text-green-800",
    Lost: "bg-red-100 text-red-800",
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{deal.name}</h1>
          <p className="text-gray-600">Owner: {deal.owner_id?.full_name}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/deals" className="text-gray-600 hover:underline">
            ← Back to All Deals
          </Link>
          <Link
            href={`/deals/${deal.id}/edit`}
            className="text-blue-600 hover:underline"
          >
            ✏️ Edit
          </Link>
        </div>
      </div>

      {/* Deal Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="border rounded p-4">
          <h2 className="font-semibold mb-3">Deal Details</h2>
          <p>
            <strong>Stage:</strong>{" "}
            <span
              className={`inline-block px-2 py-1 text-xs rounded-full ${
                stageColors[deal.stage] || "bg-gray-100"
              }`}
            >
              {deal.stage}
            </span>
          </p>
          <p>
            <strong>Estimated Value:</strong>{" "}
            {deal.value ? `$${deal.value.toLocaleString()}` : "—"}
          </p>
          <p>
            <strong>Close Date:</strong> {deal.close_date || "—"}
          </p>
        </div>

        <div className="border rounded p-4">
          <h2 className="font-semibold mb-3">Lead</h2>
          {deal.lead_id ? (
            <div>
              <p>
                <Link
                  href={`/leads/${deal.lead_id}`}
                  className="text-blue-600 hover:underline"
                >
                  {deal.lead_name}
                </Link>
              </p>
              <p>
                {deal.lead_company || "No company"} • {deal.lead!.source}
              </p>
            </div>
          ) : (
            <p className="text-gray-500">Standalone deal (no linked lead)</p>
          )}
        </div>
      </div>

      {/* Notes */}
      {deal.notes && (
        <div className="mb-8 p-4 border rounded ">
          <h2 className="font-semibold mb-2">Notes</h2>
          <p>{deal.notes}</p>
        </div>
      )}

      {/* <TasksAndActivityLog
        deal={deal}
        initialData={{ tasks: (tasks as unknown as Task[]) || [] }}
      /> */}
      {deal && <ActivityTimeline entityType="deal" entityId={deal.id} />}
    </div>
  );
}
