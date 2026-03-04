import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um agrônomo PhD especialista em nutrição de plantas de café (Coffea canephora — Conilon e Coffea arabica — Arábica), com mais de 20 anos de experiência em diagnóstico foliar visual de deficiências nutricionais.

Analise a imagem fornecida de uma folha de café. Identifique se há sinais visuais de deficiências nutricionais.

NUTRIENTES A AVALIAR:
- Nitrogênio (N): Clorose generalizada começando pelas folhas velhas
- Fósforo (P): Folhas velhas com coloração arroxeada/bronze
- Potássio (K): Necrose nas bordas das folhas velhas
- Cálcio (Ca): Deformação das folhas novas, morte de meristemas
- Magnésio (Mg): Clorose internerval em folhas velhas (espinha de peixe)
- Enxofre (S): Clorose uniforme nas folhas novas
- Zinco (Zn): Folhas pequenas, rosetas, encurtamento de entrenós
- Boro (B): Morte de ponteiros, folhas deformadas e endurecidas
- Ferro (Fe): Clorose internerval nas folhas novas (nervuras verdes)
- Manganês (Mn): Clorose internerval com pontuações necróticas
- Cobre (Cu): Folhas novas murchas e tortas
- Molibdênio (Mo): Necrose marginal em folhas velhas

IMPORTANTE:
- Se a imagem NÃO for de uma planta de café, retorne identificado: false.
- Pode haver múltiplas deficiências simultâneas.
- Indique a severidade de cada deficiência.
- Sugira produtos comerciais reais utilizados no Brasil.
- Explique as causas prováveis da deficiência.

Responda EXCLUSIVAMENTE com JSON válido (sem markdown, sem texto extra):
{
  "identificado": true,
  "saude_geral": "deficiente" | "saudavel" | "atencao",
  "resumo": "Descrição geral do estado nutricional da planta",
  "deficiencias": [
    {
      "nutriente": "Nome do nutriente",
      "simbolo": "Símbolo químico",
      "severidade": "leve" | "moderada" | "severa",
      "confianca": 0.85,
      "sintomas_observados": "Descrição dos sintomas visuais identificados na imagem",
      "causas_provaveis": [
        "Causa 1 da deficiência",
        "Causa 2 da deficiência"
      ],
      "suplementacao": {
        "via_solo": "Recomendação de adubação via solo",
        "via_foliar": "Recomendação de aplicação foliar",
        "dose": "Dosagem recomendada",
        "epoca": "Melhor época de aplicação"
      },
      "produtos_recomendados": [
        {
          "nome": "Nome comercial do produto",
          "principio_ativo": "Ingrediente ativo",
          "dose": "Dose recomendada por hectare",
          "modo_aplicacao": "Foliar / Solo / Fertirrigação"
        }
      ]
    }
  ],
  "orientacao_geral": "Orientação técnica geral para manejo nutricional"
}

Se a planta parecer saudável, retorne saude_geral "saudavel" com deficiencias como array vazio e orientacao_geral preventiva.`;

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

    const { imageBase64, coffeeType } = await req.json();

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

    const userPrompt = coffeeType
      ? `Analise esta imagem de folha de café ${coffeeType === 'conilon' ? 'Conilon (Coffea canephora)' : 'Arábica (Coffea arabica)'}. Identifique todas as deficiências nutricionais visíveis, suas causas prováveis e os produtos recomendados para correção.`
      : `Analise esta imagem de folha de café. Identifique todas as deficiências nutricionais visíveis, suas causas prováveis e os produtos recomendados para correção.`;

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
          throw new Error("Could not parse AI response as JSON");
        }
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("identify-foliar-deficiency error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
