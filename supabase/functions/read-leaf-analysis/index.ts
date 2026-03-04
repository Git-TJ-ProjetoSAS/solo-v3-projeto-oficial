import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um engenheiro agrônomo especialista em nutrição de plantas, com ampla experiência em interpretar laudos de análise foliar de café no Brasil.

Analise a imagem fornecida de um laudo de análise foliar. Extraia TODOS os valores numéricos dos seguintes nutrientes:

MACRONUTRIENTES (valores em %):
- N (Nitrogênio) — em %
- P (Fósforo) — em %
- K (Potássio) — em %
- Mg (Magnésio) — em %
- Ca (Cálcio) — em %
- S (Enxofre) — em %

MICRONUTRIENTES (valores em ppm ou mg/kg):
- Zn (Zinco) — em ppm
- B (Boro) — em ppm
- Cu (Cobre) — em ppm
- Mn (Manganês) — em ppm
- Fe (Ferro) — em ppm
- Mo (Molibdênio) — em ppm

IMPORTANTE:
- Se um valor não estiver presente ou legível, use null.
- Preste atenção às unidades. Macronutrientes devem estar em %, micronutrientes em ppm (mg/kg).
- Se os valores estiverem em g/kg, divida por 10 para converter para %.
- Se os valores de micronutrientes estiverem em mg/dm³ ou mg/L, considere como ppm.
- Se o documento não for uma análise foliar, retorne "valido": false.

Responda EXCLUSIVAMENTE com um JSON válido (sem markdown, sem texto extra):
{
  "valido": true,
  "n": 3.2,
  "p": 0.12,
  "k": 2.0,
  "mg": 0.4,
  "ca": 1.2,
  "s": 0.18,
  "zn": 15,
  "b": 50,
  "cu": 12,
  "mn": 80,
  "fe": 120,
  "mo": 0.5,
  "observacoes": "Breve nota sobre a qualidade da leitura ou valores duvidosos"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Nenhuma imagem fornecida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    const estimatedSize = imageBase64.length * 0.75;
    if (estimatedSize > MAX_IMAGE_SIZE) {
      return new Response(
        JSON.stringify({ error: "Imagem muito grande. Máximo: 10MB" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia os valores de macro e micronutrientes deste laudo de análise foliar de café." },
              {
                type: "image_url",
                image_url: { url: imageBase64 },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro na análise de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        const objectMatch = content.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          parsed = JSON.parse(objectMatch[0]);
        } else {
          throw new Error("Não foi possível interpretar a resposta da IA");
        }
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("read-leaf-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
