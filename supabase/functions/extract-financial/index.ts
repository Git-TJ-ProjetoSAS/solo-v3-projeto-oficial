import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um assistente especializado em extrair e classificar dados financeiros de gastos agrícolas para cafeicultura (Conilon e Arábica).

## CATEGORIAS (Centros de Custo) — use EXATAMENTE uma destas 7 chaves:

1. "adubos_corretivos" — Adubos e Corretivos
   Exemplos: Ureia, MAP, Superfosfato, Calcário, Gesso, KCl, NPK, Dripsol, FTE, adubo foliar, ácido bórico, sulfato de zinco, matéria orgânica, composto, cama de frango.

2. "defensivos_agricolas" — Defensivos Agrícolas
   Exemplos: Durivo, Miravis, Comet, Opera, Nativo, Verdadero, glifosato, Roundup, fungicida, inseticida, herbicida, acaricida, nematicida, adjuvante, óleo mineral, espalhante.

3. "combustivel_lubrificantes" — Combustível e Lubrificantes
   Exemplos: diesel, gasolina, óleo lubrificante, graxa, etanol, combustível, arla 32.

4. "manutencao_maquinario" — Manutenção de Maquinário
   Exemplos: peça de trator, pneu, correia, filtro, manutenção preventiva, reparo, solda, retífica, borracha, rolamento, mangueira hidráulica.

5. "energia_eletrica" — Energia Elétrica
   Exemplos: conta de energia, conta de luz, tarifa elétrica, energia irrigação, KWh, demanda contratada.

6. "mao_de_obra_servicos" — Mão de Obra e Serviços
   Exemplos: diária, diarista, tratorista, colheita, capina, poda, desbrota, replantio, aplicação manual, serviço terceirizado, frete, consultoria agronômica, hora-máquina aluguel.

7. "outros_administrativos" — Outros Custos Administrativos
   Exemplos: internet, telefone, seguro, impostos, INSS, ITR, licença ambiental, material de escritório, software, contabilidade.

## REGRAS ESTRITAS DE CLASSIFICAÇÃO:

- Se o item contém "Ureia", "MAP", "Calcário", "Dripsol", "Superfosfato", "KCl", "NPK", "FTE", "gesso", "adubo", "fertilizante", "corretivo" → "adubos_corretivos"
- Se o item contém "Durivo", "Miravis", "Comet", "Opera", "Nativo", "glifosato", "Roundup", "fungicida", "inseticida", "herbicida" → "defensivos_agricolas"
- Se o item contém "diesel", "gasolina", "combustível", "lubrificante", "graxa", "arla" → "combustivel_lubrificantes"
- Se o item contém "peça", "pneu", "manutenção", "reparo", "filtro", "correia", "retífica" → "manutencao_maquinario"
- Se o item contém "energia", "luz", "kwh", "tarifa elétrica" → "energia_eletrica"
- Se o item contém "diária", "diarista", "tratorista", "colheita", "capina", "poda", "serviço", "frete" → "mao_de_obra_servicos"
- Se o item contém "internet", "imposto", "seguro", "INSS", "contabilidade" → "outros_administrativos"
- Se NÃO tiver certeza da categoria → use "revisao_manual"

## EXTRAÇÃO DE FORNECEDOR (OBRIGATÓRIO):

- SEMPRE identifique o nome da loja, cooperativa, empresa ou fornecedor mencionado no texto ou nota fiscal.
- Procure por padrões como: "na [Nome]", "comprei na [Nome]", "da [Nome]", razão social, CNPJ header.
- Se não encontrar, retorne string vazia.

## FORMATO DE RESPOSTA:

Retorne APENAS um JSON (sem markdown, sem texto adicional) com estas chaves:
{
  "data": "YYYY-MM-DD",
  "descricao": "descrição do item/serviço",
  "quantidade": 1,
  "valor_unitario": 0.00,
  "valor_total": 0.00,
  "categoria": "uma_das_7_categorias_ou_revisao_manual",
  "fornecedor": "nome do fornecedor ou vazio",
  "resumo_confirmacao": "Frase amigável para confirmar. Ex: Entendi que você gastou R$ 3.000 em 20 sacos de Ureia na AgroMais. Confirma?"
}

Se houver múltiplos itens na nota, retorne um array de objetos com a mesma estrutura.
Use a data atual (${new Date().toISOString().split('T')[0]}) se a data não for mencionada.`;

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

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY não configurada. Adicione sua chave nas configurações." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text, imageBase64, method } = await req.json();

    // Input size validation for images (max 10MB)
    if (imageBase64) {
      const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
      const estimatedSize = imageBase64.length * 0.75;
      if (estimatedSize > MAX_IMAGE_SIZE) {
        return new Response(
          JSON.stringify({ error: "Imagem muito grande. Máximo: 10MB" }),
          { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (imageBase64) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: "Extraia os dados financeiros desta nota fiscal/recibo. Classifique cada item em um dos 7 centros de custo e identifique OBRIGATORIAMENTE o fornecedor:" },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      });
    } else if (text) {
      messages.push({
        role: "user",
        content: `Extraia os dados financeiros, identifique o fornecedor e classifique no centro de custo correto: "${text}"`,
      });
    } else {
      throw new Error("Nenhum dado fornecido (texto ou imagem)");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições da OpenAI excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "Chave da OpenAI inválida. Verifique sua OPENAI_API_KEY." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response
    let parsed;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleanContent);
    } catch {
      parsed = { error: "Não foi possível interpretar os dados", raw: content };
    }

    return new Response(JSON.stringify({ data: parsed, method: method || "manual" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-financial error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
