import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function getOrCreateVapidKeys(supabase: ReturnType<typeof createClient>) {
  const { data: config } = await supabase
    .from("push_config")
    .select("*")
    .eq("id", "vapid")
    .single();

  if (config) {
    // private_key_jwk stores { publicKey: JWK, privateKey: JWK }
    const keys = await webpush.importVapidKeys(config.private_key_jwk);
    return { keys, publicKeyB64: config.public_key };
  }

  // Generate new VAPID keys
  const keys = await webpush.generateVapidKeys({ extractable: true });
  const publicKeyB64 = await webpush.exportApplicationServerKey(keys);
  const exportedKeys = await webpush.exportVapidKeys(keys);

  await supabase.from("push_config").insert({
    id: "vapid",
    public_key: publicKeyB64,
    private_key_jwk: exportedKeys, // { publicKey: JWK, privateKey: JWK }
  });

  return { keys, publicKeyB64 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { user_id, message, severity, deficit_mm } = body;

    if (!user_id || !message) {
      return new Response(
        JSON.stringify({ error: "user_id and message required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { keys: vapidKeys } = await getOrCreateVapidKeys(supabase);

    // Create application server
    const appServer = await webpush.ApplicationServer.new({
      contactInformation: "mailto:admin@solov3.app",
      vapidKeys,
    });

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (subError) throw subError;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, reason: "no subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const title =
      severity === "critical"
        ? "⚠️ Alerta Crítico de Déficit Hídrico"
        : "⚡ Alerta de Déficit Hídrico";

    const payload = JSON.stringify({
      title,
      body: message,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: `water-deficit-${user_id}`,
      data: {
        url: "/client/irrigacao",
        severity,
        deficit_mm,
      },
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        const subscriber = appServer.subscribe({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        });

        await subscriber.pushTextMessage(payload, {});
        sent++;
      } catch (e: unknown) {
        console.error("Push error for subscription:", sub.id, e);
        const errMsg = e instanceof Error ? e.message : String(e);
        if (errMsg.includes("410") || errMsg.includes("404") || errMsg.includes("Gone")) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        }
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-push-notification error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
