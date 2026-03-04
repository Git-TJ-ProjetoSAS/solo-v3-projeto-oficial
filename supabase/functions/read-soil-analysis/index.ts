import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um engenheiro agrônomo especialista em análise de solo, com ampla experiência em interpretar laudos laboratoriais de análise de solo no Brasil.

Analise a imagem fornecida de um laudo de análise de solo. Extraia TODOS os valores numéricos dos seguintes parâmetros:

MACRONUTRIENTES:
- Ca (Cálcio) — em cmolc/dm³
- Mg (Magnésio) — em cmolc/dm³  
- K (Potássio) — em mg/dm³
- H+Al (Hidrogênio + Alumínio) — em cmolc/dm³
- P (Fósforo) — em mg/dm³
- MO (Matéria Orgânica) — converter para g/dm³. ATENÇÃO: muitos laudos brasileiros expressam MO em dag/kg. Se a unidade for dag/kg, multiplique por 10 para converter para g/dm³. Se for em %, multiplique por 10 também (1% = 10 g/dm³).

MICRONUTRIENTES:
- Zn (Zinco) — em mg/dm³
- B (Boro) — em mg/dm³
- Mn (Manganês) — em mg/dm³
- Fe (Ferro) — em mg/dm³
- Cu (Cobre) — em mg/dm³
- S (Enxofre) — em mg/dm³

FÓSFORO REMANESCENTE:
- P-rem (Fósforo Remanescente) — em mg/L. Muitos laudos brasileiros incluem este valor. Pode aparecer como "P-rem", "P rem", "P remanescente", "Fósforo remanescente" ou "P-remanescente". Extraia se presente.

GRANULOMETRIA (se disponível):
- argila — em %
- silte — em %
- areia — em %

IMPORTANTE:
- Se um valor não estiver presente ou legível, use null.
- Preste atenção às unidades. Converta se necessário.
- K pode aparecer em cmolc/dm³ ou mg/dm³. Se estiver em cmolc/dm³, multiplique por 391 para converter para mg/dm³.
- Se o documento não for uma análise de solo, retorne "valido": false.

Responda EXCLUSIVAMENTE com um JSON válido (sem markdown, sem texto extra):
{
  "valido": true,
  "ca": 3.2,
  "mg": 1.1,
  "k": 120,
  "hAl": 2.8,
  "p": 8.5,
  "mo": 28,
  "zn": 2.1,
  "b": 0.4,
  "mn": 12,
  "fe": 35,
  "cu": 0.8,
  "s": 9,
  "pRem": 25,
  "argila": null,
  "silte": null,
  "areia": null,
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

    // Detect mime type and ensure proper data URI format
    let dataUri = imageBase64;
    if (!imageBase64.startsWith("data:")) {
      // Check if it's a PDF (starts with JVBERi) or image
      if (imageBase64.startsWith("JVBERi") || imageBase64.startsWith("/9j/") === false && imageBase64.startsWith("iVBOR") === false) {
        // Likely a PDF
        dataUri = `data:application/pdf;base64,${imageBase64}`;
      } else if (imageBase64.startsWith("/9j/")) {
        dataUri = `data:image/jpeg;base64,${imageBase64}`;
      } else if (imageBase64.startsWith("iVBOR")) {
        dataUri = `data:image/png;base64,${imageBase64}`;
      } else {
        dataUri = `data:image/jpeg;base64,${imageBase64}`;
      }
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
              { type: "text", text: "Extraia os valores de macro e micronutrientes deste laudo de análise de solo." },
              {
                type: "image_url",
                image_url: { url: dataUri },
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
    console.error("read-soil-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
