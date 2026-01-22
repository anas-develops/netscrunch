// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-client-info, apikey",
};

// Helper to send JSON responses with CORS
function jsonRes(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

Deno.serve(async (req) => {
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonRes({ error: "Unauthorized" }, 401);
    }

    const jwt = authHeader.split(" ")[1];
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return jsonRes({ error: "Invalid user" }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("department")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return jsonRes(
        { error: "Profile not found", details: profileError.message },
        404
      );
    }

    const department = profile.department;
    const userId = user.id;

    // 👇 SET THE USER CONTEXT SO auth.uid() WORKS IN TRIGGERS
    await supabase.rpc("set_request_user", { user_id: userId });

    const { prospectIds } = await req.json();
    if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
      return jsonRes({ error: "prospectIds must be a non-empty array" }, 400);
    }

    const errorMessages = [];

    const results = await Promise.allSettled(
      prospectIds.map(async (prospectId: string) => {
        const { data: existingLeads, error: checkError } = await supabase
          .from("leads")
          .select("id")
          .eq("prospect_id", prospectId)
          .limit(1);

        if (checkError) {
          errorMessages.push(
            `Check failed prospect_id: ${prospectId}: ${checkError.message}`
          );
          throw new Error(
            `Check failed prospect_id: ${prospectId}: ${checkError.message}`
          );
        }
        if (existingLeads?.length > 0) {
          errorMessages.push(
            `Lead already exists for prospect_id prospect_id: ${prospectId}: ${prospectId}`
          );
          throw new Error(
            `Lead already exists for prospect_id prospect_id: ${prospectId}: ${prospectId}`
          );
        }

        const { data: prospect, error: fetchError } = await supabase
          .from("prospects")
          .select("*")
          .eq("id", prospectId)
          .single();

        if (fetchError) {
          errorMessages.push(
            `Fetch failed prospect_id: ${prospectId}: ${fetchError.message}`
          );
          throw new Error(
            `Fetch failed prospect_id: ${prospectId}: ${fetchError.message}`
          );
        }

        const { error: insertError } = await supabase.rpc(
          "create_lead_with_context",
          {
            p_user_id: userId,
            p_name: prospect.name,
            p_company: prospect.company || "",
            p_email: prospect.email,
            p_linkedin_url: prospect.linked_in_url || "",
            p_prospect_id: prospect.id,
            p_department: department,
          }
        );

        if (insertError) {
          errorMessages.push(
            `Insert failed for prospect_id: ${prospectId}: ${insertError.message}`
          );
          throw new Error(
            `Insert failed prospect_id: ${prospectId}: ${insertError.message}`
          );
        }
        return { prospectId };
      })
    );

    const successes = results.filter((r) => r.status === "fulfilled").length;
    const failures = results.filter((r) => r.status === "rejected").length;

    return jsonRes({
      message: "Bulk conversion completed",
      successes,
      failures,
      total: prospectIds.length,
      errorMessages,
      jwt,
      user,
    });
  } catch (err) {
    console.error("Function error:", err);
    return jsonRes(
      { error: "Internal server error", details: err?.message },
      500
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/bulk-convert-to-leads' \
    --header 'Authorization: Bearer eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODQ0NTUyNzV9.z1uXxy1psW_8Uxgnw2FGLrIZ7uWZlZvP_OiUAOlmhs9v5fC-SNNkxvKiRpZ_biZKYurEvNIDn6YD-qqZn_5zgQ' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
