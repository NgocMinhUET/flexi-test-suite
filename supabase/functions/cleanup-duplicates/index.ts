import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token to verify auth
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin or teacher
    const { data: roles } = await supabaseUser
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some((r) => r.role === "admin");
    const isTeacher = roles?.some((r) => r.role === "teacher");

    if (!isAdmin && !isTeacher) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { questionIds } = await req.json();

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return new Response(JSON.stringify({ error: "No question IDs provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for the actual update
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // For teachers, verify they own the questions
    if (!isAdmin) {
      const { data: ownedQuestions } = await supabaseAdmin
        .from("questions")
        .select("id")
        .in("id", questionIds)
        .eq("created_by", user.id);

      const ownedIds = new Set(ownedQuestions?.map((q) => q.id) || []);
      const notOwnedIds = questionIds.filter((id: string) => !ownedIds.has(id));

      if (notOwnedIds.length > 0) {
        return new Response(
          JSON.stringify({
            error: "Teachers can only delete their own questions",
            notOwnedCount: notOwnedIds.length,
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Soft delete in batches
    const batchSize = 100;
    let totalDeleted = 0;

    for (let i = 0; i < questionIds.length; i += batchSize) {
      const batch = questionIds.slice(i, i + batchSize);
      const { error } = await supabaseAdmin
        .from("questions")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", batch);

      if (error) {
        console.error("Batch delete error:", error);
        throw error;
      }
      totalDeleted += batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, deleted: totalDeleted }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Cleanup error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
