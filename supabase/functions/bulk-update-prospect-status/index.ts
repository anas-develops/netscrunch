// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const ALLOWED_STATUSES = [
  "Not Contacted",
  "Not Qualified",
  "Pre-Qualified",
  "Lost Lead",
  "Junk Lead",
  "Contacted",
  "Contacted in Future",
  "Attempted to Contact",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-client-info, apikey",
};

function jsonRes(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 🔐 Auth
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

    const { prospectIds, status } = await req.json();

    if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
      return jsonRes({ error: "prospectIds must be a non-empty array" }, 400);
    }
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return jsonRes({ error: "Invalid status" }, 400);
    }

    // ✅ Call DB function that sets auth.uid() context
    const { error: rpcError } = await supabase.rpc(
      "update_prospect_status_with_context",
      {
        p_user_id: user.id,
        p_prospect_ids: prospectIds,
        p_new_status: status,
      }
    );

    if (rpcError) {
      console.error("RPC failed:", rpcError);
      return jsonRes(
        { error: "Failed to update prospects", details: rpcError.message },
        500
      );
    }

    return jsonRes({
      message: "Prospects updated successfully",
      updated_count: prospectIds.length,
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/bulk-update-prospect-status' \
    --header 'Authorization: Bearer eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODQ0NTYwNDB9.Tpfcl7Vu1gPB1mqt32eJx9bm7DKywZZTjaOFADonqm7qHj935yHnL_1y_jfQRA0mLSpY5Uhrps7tf7ewFM9kwg' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
