import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um fitopatologista PhD especialista em cafeicultura (Coffea canephora — Conilon e Coffea arabica — Arábica), com mais de 20 anos de experiência em diagnóstico visual de doenças e pragas do cafeeiro.

Analise a imagem fornecida de uma folha, fruto ou ramo de café. Identifique se há sinais visuais de doenças fúngicas, bacterianas, pragas (insetos, ácaros, nematoides) ou deficiências nutricionais.

IMPORTANTE:
- Se a imagem NÃO for de uma planta de café ou não for possível identificar com confiança, retorne confianca: 0 e explique.
- Avalie a severidade: leve, moderada ou severa.
- Sugira produtos comerciais reais utilizados no Brasil para o controle.
- Indique o momento ideal e o método de aplicação.

Você DEVE responder EXCLUSIVAMENTE com um JSON válido no seguinte formato (sem markdown, sem texto extra):
{
  "identificado": true,
  "praga": "Nome da doença ou praga",
  "tipo": "doenca" | "praga" | "deficiencia" | "saudavel",
  "confianca": 0.95,
  "severidade": "leve" | "moderada" | "severa",
  "sintomas": "Descrição detalhada dos sintomas observados na imagem",
  "produtos_recomendados": [
    {
      "nome": "Nome comercial",
      "principio_ativo": "Ingrediente ativo",
      "dose": "Dose recomendada",
      "metodo": "Método de aplicação"
    }
  ],
  "orientacao": "Instrução técnica de manejo e momento ideal de aplicação",
  "culturas_afetadas": ["conilon", "arabica"]
}

Se a planta parecer saudável, retorne tipo "saudavel" com confianca alta e orientacao preventiva.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
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

    const { imageBase64, coffeeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Nenhuma imagem fornecida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input size validation (max 10MB)
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

    const userPrompt = coffeeType
      ? `Analise esta imagem de café ${coffeeType === 'conilon' ? 'Conilon (Coffea canephora)' : 'Arábica (Coffea arabica)'}. Identifique doenças, pragas ou deficiências nutricionais.`
      : `Analise esta imagem de café. Identifique doenças, pragas ou deficiências nutricionais.`;

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
              { type: "text", text: userPrompt },
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
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao workspace." }),
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

    // Parse JSON from the AI response
    let parsed;
    try {
      // Try direct parse first
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        // Try to find JSON object in the text
        const objectMatch = content.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          parsed = JSON.parse(objectMatch[0]);
        } else {
          throw new Error("Could not parse AI response as JSON");
        }
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("identify-pest error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
