import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import webpush from "https://esm.sh/web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")?.trim() || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")?.trim() || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")?.trim() || "mailto:notifications@smartshopping.app";
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN")?.trim() || "*";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RELATIVE_PATH_REGEX = /^\/(?!\/)/;

const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 500;
const MAX_TAG_LENGTH = 80;
const MAX_URL_LENGTH = 512;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  ...(ALLOWED_ORIGIN !== "*" ? { Vary: "Origin" } : {}),
};

interface PushErrorDetails {
  statusCode?: number;
  message: string;
  body?: unknown;
}

function parsePushError(err: unknown): PushErrorDetails {
  if (err && typeof err === "object") {
    const record = err as Record<string, unknown>;
    return {
      statusCode: typeof record.statusCode === "number" ? record.statusCode : undefined,
      message: typeof record.message === "string" ? record.message : String(err),
      body: record.body,
    };
  }
  return { message: err instanceof Error ? err.message : String(err) };
}

function isValidRelativePath(value: unknown, maxLen: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLen &&
    RELATIVE_PATH_REGEX.test(value)
  );
}

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

    const rawBody: unknown = await req.json();
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bodyRecord = rawBody as Record<string, unknown>;
    const householdId = bodyRecord.householdId;
    const rawTitle = bodyRecord.title;
    const rawBodyText = bodyRecord.body;
    const rawTag = bodyRecord.tag;
    const rawUrl = bodyRecord.url;
    const rawIcon = bodyRecord.icon;
    const rawBadge = bodyRecord.badge;
    const includeSender = bodyRecord.includeSender === true;

    if (typeof householdId !== "string" || !UUID_REGEX.test(householdId)) {
      return new Response(JSON.stringify({ error: "Invalid or missing householdId (UUID expected)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof rawTitle !== "string" || rawTitle.trim().length === 0 || rawTitle.trim().length > MAX_TITLE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Invalid title (non-empty string max ${MAX_TITLE_LENGTH} chars expected)` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof rawBodyText !== "string" || rawBodyText.trim().length === 0 || rawBodyText.trim().length > MAX_BODY_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Invalid body (non-empty string max ${MAX_BODY_LENGTH} chars expected)` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let safeUrl = "/";
    if (rawUrl !== undefined && rawUrl !== null && rawUrl !== "") {
      if (!isValidRelativePath(rawUrl, MAX_URL_LENGTH)) {
        return new Response(
          JSON.stringify({ error: "Invalid url (must be a safe relative path starting with /)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      safeUrl = rawUrl;
    }

    const title = rawTitle.trim();
    const body = rawBodyText.trim();
    const tag =
      typeof rawTag === "string" && rawTag.trim().length > 0 && rawTag.trim().length <= MAX_TAG_LENGTH
        ? rawTag.trim()
        : "smart-shopping-default";
    const icon = isValidRelativePath(rawIcon, MAX_URL_LENGTH) ? rawIcon : "/icon-192.png";
    const badge = isValidRelativePath(rawBadge, MAX_URL_LENGTH) ? rawBadge : "/icon-192.png";

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verify user is a member of the requested household (CRIT-03)
    const { data: member, error: memberError } = await supabaseClient
      .from("household_members")
      .select("id")
      .eq("household_id", householdId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError || !member) {
      return new Response(
        JSON.stringify({ error: "Forbidden: You are not a member of this household" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch subscriptions for household
    let query = supabaseClient
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .eq("household_id", householdId);

    if (!includeSender) {
      query = query.neq("user_id", user.id);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      return new Response(JSON.stringify({ error: subError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[send-push-notification] 0 subscriptions found for household ${householdId} (includeSender: ${includeSender})`);
      return new Response(
        JSON.stringify({ sentCount: 0, totalCount: 0, pruned: 0, message: "No registered subscriptions found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-push-notification] Dispatching push to ${subscriptions.length} devices for household ${householdId} (includeSender: ${includeSender})`);

    const payload = JSON.stringify({
      title,
      body,
      tag,
      url: safeUrl,
      icon,
      badge,
      vibrate: [100, 50, 100],
    });

    const deadSubscriptionIds: string[] = [];

    const sendResults = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          console.log(`[send-push-notification] Sending to endpoint: ${sub.endpoint.slice(0, 45)}...`);
          const res = await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          console.log(`[send-push-notification] Delivery success for ${sub.id}: statusCode ${res?.statusCode || 201}`);
          return res;
        } catch (err: unknown) {
          const parsed = parsePushError(err);
          console.error(
            `[send-push-notification] Delivery failed for ${sub.id}:`,
            parsed.statusCode,
            parsed.message,
            parsed.body
          );
          if (parsed.statusCode === 410 || parsed.statusCode === 404) {
            deadSubscriptionIds.push(sub.id);
          }
          throw err;
        }
      })
    );

    // 2. Auto-prune dead/expired subscriptions
    if (deadSubscriptionIds.length > 0) {
      console.log(`[send-push-notification] Pruning ${deadSubscriptionIds.length} dead subscriptions`);
      await supabaseClient
        .from("push_subscriptions")
        .delete()
        .in("id", deadSubscriptionIds);
    }

    const successCount = sendResults.filter((r) => r.status === "fulfilled").length;
    const errors = sendResults
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => parsePushError(r.reason).message);

    return new Response(
      JSON.stringify({
        sentCount: successCount,
        totalCount: subscriptions.length,
        pruned: deadSubscriptionIds.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
