import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function GlobalActivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "manager") {
    redirect("/dashboard");
  }

  const { data: activities } = await supabase
    .from("activity_log")
    .select(
      `
      id,
      timestamp,
      action_type,
      entity_type,
      entity_id,
      metadata,
      user:profiles!user_id (full_name)
    `
    )
    .order("timestamp", { ascending: false })
    .limit(100); // Add pagination later

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Global Activity Feed</h1>
      {/* Add filters: user, date range, entity type */}
      <div className="space-y-4">
        {activities?.map((activity) => (
          <div key={activity.id} className="p-4 border rounded">
            <div className="font-medium">{activity.user.full_name}</div>
            <div>{activity.action_type}</div>
            <div className="text-sm text-gray-600">
              {new Date(activity.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
