import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import webpush from "https://esm.sh/web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:notifications@smartshopping.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify authenticated user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const bodyData = await req.json();
    const { householdId, title, body, tag, url, icon, badge } = bodyData;

    if (!householdId || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields (householdId, title, body)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch subscriptions for household EXCLUDING the triggering user (self-suppression)
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("household_id", householdId)
      .neq("user_id", user.id);

    if (subError) {
      return new Response(JSON.stringify({ error: subError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sentCount: 0, pruned: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      tag: tag || "smart-shopping-default",
      url: url || "/",
      icon: icon || "/icon-192.png",
      badge: badge || "/icon-192.png",
      vibrate: [100, 50, 100],
    });

    const deadSubscriptionIds: string[] = [];

    const sendResults = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
        } catch (err: any) {
          // If browser returned 410 Gone or 404 Not Found, mark for pruning
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            deadSubscriptionIds.push(sub.id);
          }
          throw err;
        }
      })
    );

    // 2. Auto-prune dead/expired subscriptions
    if (deadSubscriptionIds.length > 0) {
      await supabaseClient
        .from("push_subscriptions")
        .delete()
        .in("id", deadSubscriptionIds);
    }

    const successCount = sendResults.filter((r) => r.status === "fulfilled").length;

    return new Response(
      JSON.stringify({ sentCount: successCount, pruned: deadSubscriptionIds.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
