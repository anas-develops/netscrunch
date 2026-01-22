// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Allowed lead statuses (must match your CHECK constraint)
const ALLOWED_STATUSES = [
  "Warmed-up",
  "Negotiating",
  "Service Initiated",
  "Service Declined",
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
    // 🔐 Authenticate user
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

    // 📥 Parse request
    const { leadIds, status } = await req.json();

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return jsonRes({ error: "leadIds must be a non-empty array" }, 400);
    }
    if (!status || typeof status !== "string") {
      return jsonRes({ error: "Valid status is required" }, 400);
    }
    if (!ALLOWED_STATUSES.includes(status)) {
      return jsonRes({ error: "Invalid status value" }, 400);
    }

    // ✅ Call DB function that sets auth context
    const { error: rpcError } = await supabase.rpc(
      "update_lead_status_with_context",
      {
        p_user_id: user.id,
        p_lead_ids: leadIds,
        p_new_status: status,
      }
    );

    if (rpcError) {
      console.error("RPC failed:", rpcError);
      return jsonRes(
        { error: "Failed to update leads", details: rpcError.message },
        500
      );
    }

    return jsonRes({
      message: "Leads updated successfully",
      updated_count: leadIds.length,
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/bulk-update-lead-status' \
    --header 'Authorization: Bearer eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODQ0NTU4MDl9.xDbL7PMQCLCn7Bxd1Zjaj3kRotN2_UebCSi_uImi9ImSJDPXJCnko-U-y3agID3BkjEtjXHZlTdLEydWOiCPPA' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
