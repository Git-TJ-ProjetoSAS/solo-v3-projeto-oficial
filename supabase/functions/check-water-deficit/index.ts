import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Kc dinâmico simplificado para café adulto (>24 meses)
function getKc(month: number, ageMonths: number): number {
  if (ageMonths <= 6) return 0.6;
  if (ageMonths <= 12) return 0.78;
  if (ageMonths <= 24) return 0.92;
  if (month >= 5 && month <= 8) return 0.80;
  if (month >= 9 && month <= 10) return 0.90;
  if (month === 11 || month === 12) return 1.05;
  if (month >= 1 && month <= 2) return 1.15;
  return 0.95;
}

// CAD por textura (mm)
function getCAD(textura: string): number {
  if (textura === "arenosa") return 25;
  if (textura === "argilosa") return 60;
  return 40; // media
}

// ETo padrão por mês (ES average fallback)
const DEFAULT_ETO: Record<number, number> = {
  1: 5.0, 2: 5.3, 3: 4.6, 4: 3.9, 5: 3.1, 6: 2.7,
  7: 2.8, 8: 3.2, 9: 3.7, 10: 4.2, 11: 4.6, 12: 4.9,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller: accept service_role (cron) or authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all irrigated talhões
    const { data: talhoes, error: tErr } = await supabase
      .from("talhoes")
      .select("id, user_id, name, irrigated, planting_month, planting_year, coffee_type")
      .eq("irrigated", true);

    if (tErr) throw tErr;
    if (!talhoes || talhoes.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhum talhão irrigado encontrado", alerts: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
    const todayStr = now.toISOString().split("T")[0];

    // Get soil analyses for texture info
    const talhaoIds = talhoes.map((t: any) => t.id);
    const { data: soilAnalyses } = await supabase
      .from("soil_analyses")
      .select("talhao_id, textura")
      .in("talhao_id", talhaoIds)
      .order("created_at", { ascending: false });

    // Map talhao -> most recent texture
    const textureMap: Record<string, string> = {};
    for (const sa of soilAnalyses || []) {
      if (!textureMap[sa.talhao_id]) {
        textureMap[sa.talhao_id] = sa.textura;
      }
    }

    // Fetch last 7 days of irrigation logs for all talhões
    const { data: logs } = await supabase
      .from("irrigation_logs")
      .select("talhao_id, date, etc_mm, rain_mm, rain_manual_mm, irrigation_mm, confirmed_at")
      .in("talhao_id", talhaoIds)
      .gte("date", sevenDaysAgoStr)
      .lte("date", todayStr);

    // Group logs by talhao
    const logsByTalhao: Record<string, any[]> = {};
    for (const log of logs || []) {
      if (!logsByTalhao[log.talhao_id]) logsByTalhao[log.talhao_id] = [];
      logsByTalhao[log.talhao_id].push(log);
    }

    // Check for existing unread alerts today to avoid duplicates
    const { data: existingAlerts } = await supabase
      .from("water_deficit_alerts")
      .select("talhao_id")
      .gte("created_at", todayStr + "T00:00:00Z")
      .eq("read", false);

    const alertedToday = new Set((existingAlerts || []).map((a: any) => a.talhao_id));

    const alertsToInsert: any[] = [];

    for (const talhao of talhoes) {
      if (alertedToday.has(talhao.id)) continue;

      const textura = textureMap[talhao.id] || "media";
      const cad = getCAD(textura);

      // Calculate age in months
      const plantDate = new Date(talhao.planting_year, talhao.planting_month - 1);
      const ageMonths = Math.max(0,
        (now.getFullYear() - plantDate.getFullYear()) * 12 +
        (now.getMonth() - plantDate.getMonth())
      );

      const kc = getKc(currentMonth, ageMonths);
      const eto = DEFAULT_ETO[currentMonth] || 4.0;

      // Calculate cumulative deficit over 7 days
      const talhaoLogs = logsByTalhao[talhao.id] || [];
      let cumulativeDeficit = 0;

      for (let d = 0; d < 7; d++) {
        const date = new Date(sevenDaysAgo);
        date.setDate(date.getDate() + d);
        const dateStr = date.toISOString().split("T")[0];

        const dayLog = talhaoLogs.find((l: any) => l.date === dateStr);

        const dayEtc = dayLog ? Number(dayLog.etc_mm) : eto * kc;
        const dayRain = dayLog
          ? Math.max(Number(dayLog.rain_mm), Number(dayLog.rain_manual_mm || 0))
          : 0;
        const dayIrrigation = dayLog?.confirmed_at ? Number(dayLog.irrigation_mm) : 0;

        cumulativeDeficit += dayEtc - dayRain - dayIrrigation;
      }

      cumulativeDeficit = Math.max(0, cumulativeDeficit);

      // Thresholds based on CAD
      const warningThreshold = cad * 0.5;   // 50% depletion
      const criticalThreshold = cad * 0.7;  // 70% depletion

      if (cumulativeDeficit >= criticalThreshold) {
        alertsToInsert.push({
          user_id: talhao.user_id,
          talhao_id: talhao.id,
          deficit_mm: Math.round(cumulativeDeficit * 10) / 10,
          threshold_mm: Math.round(criticalThreshold * 10) / 10,
          severity: "critical",
          message: `⚠️ CRÍTICO: Talhão "${talhao.name}" com déficit hídrico de ${cumulativeDeficit.toFixed(1)}mm (${((cumulativeDeficit / cad) * 100).toFixed(0)}% do CAD). Irrigação imediata recomendada!`,
        });
      } else if (cumulativeDeficit >= warningThreshold) {
        alertsToInsert.push({
          user_id: talhao.user_id,
          talhao_id: talhao.id,
          deficit_mm: Math.round(cumulativeDeficit * 10) / 10,
          threshold_mm: Math.round(warningThreshold * 10) / 10,
          severity: "warning",
          message: `⚡ ATENÇÃO: Talhão "${talhao.name}" com déficit hídrico de ${cumulativeDeficit.toFixed(1)}mm (${((cumulativeDeficit / cad) * 100).toFixed(0)}% do CAD). Planeje irrigação em breve.`,
        });
      }
    }

    if (alertsToInsert.length > 0) {
      const { error: insertErr } = await supabase
        .from("water_deficit_alerts")
        .insert(alertsToInsert);
      if (insertErr) throw insertErr;
    }

    return new Response(
      JSON.stringify({
        message: `Verificação concluída: ${talhoes.length} talhões analisados, ${alertsToInsert.length} alertas gerados`,
        alerts: alertsToInsert.length,
        details: alertsToInsert.map((a) => ({
          talhao: a.talhao_id,
          severity: a.severity,
          deficit_mm: a.deficit_mm,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("check-water-deficit error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
