// app/tasks/[id]/edit/page.tsx
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditIntendedCustomerProfileForm from "./editICPForm";
import { IntendedCustomerProfile } from "../../types";

export default async function EditTaskPage({
  params,
}: {
  params: { id: string };
}) {
  const routeParams = await params;
  const icpId = routeParams.id;
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch task with related data
  const {
    data: intendedCustomerProfile,
  }: {
    data: IntendedCustomerProfile | null;
  } = await supabase
    .from("intended_customer_profiles")
    .select(
      `
      id,
      title,
      description,
      tag_color,
      owner_id
    `
    )
    .eq("id", icpId)
    .single();

  if (!intendedCustomerProfile) notFound();

  // Fetch user profile for permissions
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, department")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  const canEdit =
    intendedCustomerProfile.owner_id === user.id ||
    (profile?.role === "manager" && profile.department === "B2B");

  if (!canEdit) {
    redirect("/intended-customer-profiles");
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        Edit Intended Customer Profile
      </h1>
      <EditIntendedCustomerProfileForm
        intendedCustomerProfile={
          intendedCustomerProfile as unknown as IntendedCustomerProfile
        }
        userId={user.id}
        canEdit={canEdit}
      />
    </div>
  );
}
