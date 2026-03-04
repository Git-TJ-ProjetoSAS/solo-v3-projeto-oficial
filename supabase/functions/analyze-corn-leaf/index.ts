import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um agrônomo PhD especialista em nutrição de plantas de milho (Zea mays), com mais de 20 anos de experiência em diagnóstico foliar visual e interpretação de análises laboratoriais.

DOIS MODOS DE OPERAÇÃO:

## MODO 1: DIAGNOSE VISUAL (quando receber imagem de folha)
Analise a imagem da folha de milho procurando padrões de deficiência:
- Amarelecimento em "V" partindo da ponta da folha = Nitrogênio
- Clorose internerval (nervuras verdes, entre nervuras amarelas) = Magnésio ou Zinco
- Bordas queimadas/necrose marginal = Potássio
- Folhas arroxeadas = Fósforo
- Listras brancas/esbranquiçadas entre nervuras = Zinco (folhas novas)
- Folhas novas completamente brancas = Ferro
- Pontuações necróticas entre nervuras = Manganês
- Folhas quebradiças/deformadas = Boro
- Folhas novas murchas = Cobre

DISCLAIMER OBRIGATÓRIO: Sempre inclua o aviso de que diagnose visual é probabilística e recomenda-se confirmação laboratorial.

## MODO 2: LEITURA DE LAUDO (quando receber imagem de laudo/tabela)
Extraia os valores numéricos da análise foliar:
N (g/kg), P (g/kg), K (g/kg), Ca (g/kg), Mg (g/kg), S (g/kg), B (mg/kg), Cu (mg/kg), Mn (mg/kg), Zn (mg/kg), Fe (mg/kg)
Realize conversões automáticas se os valores estiverem em outras unidades (% para g/kg, etc).

RESPOSTA JSON (sem markdown):

Para DIAGNOSE VISUAL:
{
  "modo": "visual",
  "identificado": true,
  "disclaimer": "Diagnose visual é probabilística. Recomenda-se confirmação laboratorial.",
  "saude_geral": "deficiente" | "saudavel" | "atencao",
  "resumo": "Descrição geral",
  "deficiencias": [
    {
      "nutriente": "Nome",
      "simbolo": "N",
      "severidade": "leve" | "moderada" | "severa",
      "confianca": 0.85,
      "sintomas_observados": "Descrição dos sintomas",
      "produto_recomendado": "Nome do produto",
      "dose": "Dose por hectare"
    }
  ]
}

Para LEITURA DE LAUDO:
{
  "modo": "laudo",
  "identificado": true,
  "valores": {
    "N": 28.5,
    "P": 2.1,
    "K": 22.0,
    "Ca": 5.0,
    "Mg": 3.0,
    "S": 1.5,
    "B": 12.0,
    "Cu": 8.0,
    "Mn": 40.0,
    "Zn": 18.0,
    "Fe": 100.0
  }
}

Se a imagem NÃO for de milho nem de laudo foliar, retorne: {"identificado": false, "motivo": "Imagem não reconhecida como folha de milho ou laudo foliar"}`;

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

    const { imageBase64, mode, phenologicalStage } = await req.json();

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

    const userPrompt = mode === "laudo"
      ? `Extraia os valores numéricos desta análise foliar de milho. Retorne no formato JSON especificado.`
      : `Analise esta imagem de folha de milho no estádio fenológico ${phenologicalStage || 'V8'}. Identifique todas as deficiências nutricionais visíveis, severidade e produtos recomendados para correção foliar. ${phenologicalStage && ['VT', 'R1', 'R2', 'R3'].includes(phenologicalStage) ? 'ALERTA: A planta está em estádio avançado. Se houver deficiência de macronutrientes (N, P, K), alerte que a correção foliar pode ser insuficiente e ter baixo ROI, sugerindo foco na próxima safra.' : ''}`;

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
    console.error("analyze-corn-leaf error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
