import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // GET vapid-public-key - no auth needed
  if (action === "vapid-public-key") {
    let { data: config } = await supabaseAdmin
      .from("push_config")
      .select("public_key")
      .eq("id", "vapid")
      .single();

    if (!config) {
      // Generate and store VAPID keys
      const keys = await webpush.generateVapidKeys({ extractable: true });
      const publicKeyB64 = await webpush.exportApplicationServerKey(keys);
      const exportedKeys = await webpush.exportVapidKeys(keys);

      await supabaseAdmin.from("push_config").insert({
        id: "vapid",
        public_key: publicKeyB64,
        private_key_jwk: exportedKeys,
      });

      config = { public_key: publicKeyB64 };
    }

    return new Response(
      JSON.stringify({ publicKey: config.public_key }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Auth required for subscribe/unsubscribe
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsError } =
    await supabaseUser.auth.getClaims(token);
  if (claimsError || !claims?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claims.claims.sub as string;

  if (action === "subscribe" && req.method === "POST") {
    const { subscription } = await req.json();
    if (!subscription?.endpoint || !subscription?.keys) {
      return new Response(JSON.stringify({ error: "Invalid subscription" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await supabaseUser
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        { onConflict: "user_id,endpoint" }
      );

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (action === "unsubscribe" && req.method === "POST") {
    const { endpoint } = await req.json();

    await supabaseUser
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
