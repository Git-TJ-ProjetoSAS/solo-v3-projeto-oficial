import { forwardRef } from 'react';
import type { RecommendationEngineResult } from '@/hooks/useRecommendationEngine';
import { PRODUCTIVITY_LEVELS, type ProductivityRange } from '@/types/recommendation';
import { LOGO_URL } from '@/lib/constants';

interface InvestmentSheetProps {
  recommendation: RecommendationEngineResult;
  soilData: {
    ca: number; mg: number; k: number; hAl: number;
    p: number; mo: number; vPercent: number;
    zn: number; b: number; mn: number; fe: number; cu: number; s: number;
  };
  hectares: number;
  faixaProdutiva: ProductivityRange;
  usedSeed: { name: string; company: string; price: number; seedsPerBag: number } | null;
  consultorName?: string | null;
  consultorCreaArt?: string | null;
  telefone?: string | null;
  enderecoPropriedade?: string | null;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (v: number) => Math.round(v).toLocaleString('pt-BR');

/* ─── Design Tokens ─── */
const COLORS = {
  primary: '#2d6a4f',
  primaryLight: '#40916c',
  primaryDark: '#1b4332',
  accent: '#6b4226',
  accentLight: '#a3785e',
  bg: '#ffffff',
  surface: '#f9faf8',
  surfaceWarm: '#faf6f1',
  border: '#d5dbd4',
  borderLight: '#e8ece7',
  text: '#1a1a1a',
  textSecondary: '#4a5a4a',
  textMuted: '#7a8a7a',
  blue: '#2563eb',
  purple: '#7c3aed',
  orange: '#ea580c',
  teal: '#0d9488',
  alertYellow: '#f59e0b',
  alertRed: '#dc2626',
  alertYellowBg: '#fffbeb',
  alertRedBg: '#fef2f2',
};

const PAGE: React.CSSProperties = {
  width: '210mm', minHeight: '297mm', maxWidth: '210mm', margin: '0 auto',
  padding: '10mm 12mm', fontFamily: "'Inter','Roboto','Segoe UI',system-ui,sans-serif",
  fontSize: '8.5px', lineHeight: 1.45, color: COLORS.text, backgroundColor: COLORS.bg,
  boxSizing: 'border-box',
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: '9px', fontWeight: 700, color: COLORS.primary, textTransform: 'uppercase',
  letterSpacing: '0.8px', marginBottom: '6px', paddingBottom: '3px',
  borderBottom: `1.5px solid ${COLORS.primary}`, display: 'flex', alignItems: 'center', gap: '5px',
};

const CARD: React.CSSProperties = {
  border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '8px 10px', marginBottom: '8px',
  backgroundColor: COLORS.bg, pageBreakInside: 'avoid', breakInside: 'avoid',
};

const LABEL: React.CSSProperties = { fontSize: '7px', fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' };

const FOOTER = (page: number, total: number): React.CSSProperties => ({
  borderTop: `1.5px solid ${COLORS.primary}`, paddingTop: '6px', display: 'flex', justifyContent: 'space-between',
  fontSize: '7.5px', color: COLORS.textMuted, marginTop: '10px',
});

const InvestmentSheet = forwardRef<HTMLDivElement, InvestmentSheetProps>(
  ({ recommendation, soilData, hectares, faixaProdutiva, usedSeed, consultorName, consultorCreaArt, telefone, enderecoPropriedade }, ref) => {
    const nivel = PRODUCTIVITY_LEVELS[faixaProdutiva];
    const seedCost = usedSeed ? Math.ceil((65000 * hectares) / usedSeed.seedsPerBag) * usedSeed.price : 0;
    const seedBags = usedSeed ? Math.ceil((65000 * hectares) / usedSeed.seedsPerBag) : 0;
    const totalWithSeed = recommendation.custoTotalGeral + seedCost;
    const perHaWithSeed = totalWithSeed / hectares;
    const today = new Date().toLocaleDateString('pt-BR');

    const avgTonMap: Record<ProductivityRange, number> = { baixa: 35, media: 37.5, alta: 52.5, muito_alta: 60 };
    const avgTonHa = avgTonMap[faixaProdutiva];
    const costPerTon = perHaWithSeed / avgTonHa;

    const costRows = [
      ...(recommendation.calagem.necessaria ? [{ label: 'Calagem', value: recommendation.calagem.custoEstimado }] : []),
      { label: 'Adub. Plantio', value: recommendation.adubacaoPlantio.custoEstimado },
      { label: 'Cobertura (N+S)', value: recommendation.cobertura.custoEstimado },
      ...(recommendation.correcaoPotassio.k2oCorrecao > 0 ? [{ label: 'Correção K₂O', value: recommendation.correcaoPotassio.custoEstimado }] : []),
      ...(recommendation.micronutrientes.custoEstimado > 0 ? [{ label: 'Micronutrientes', value: recommendation.micronutrientes.custoEstimado }] : []),
      ...(seedCost > 0 ? [{ label: 'Semente', value: seedCost }] : []),
    ];

    const shopItems: { name: string; qty: string; cost: number }[] = [];
    if (recommendation.calagem.necessaria) {
      shopItems.push({ name: recommendation.calagem.produto, qty: `${fmt(recommendation.calagem.quantidadeTotal)} t`, cost: recommendation.calagem.custoEstimado });
    }
    const addInsumos = (insumos: typeof recommendation.adubacaoPlantio.insumosSelecionados, fallback: { name: string; qty: string; cost: number }) => {
      if (insumos.length > 0) {
        insumos.forEach(i => shopItems.push({ name: `${i.nome} (${i.marca})`, qty: `${fmt(i.quantidadeTotal)} ${i.unidade}`, cost: i.custoTotal }));
      } else {
        shopItems.push(fallback);
      }
    };
    addInsumos(recommendation.adubacaoPlantio.insumosSelecionados, { name: `NPK ${recommendation.adubacaoPlantio.formulaSugerida}`, qty: `${fmtInt(recommendation.adubacaoPlantio.quantidadeTotal)} kg`, cost: recommendation.adubacaoPlantio.custoEstimado });
    addInsumos(recommendation.cobertura.insumosSelecionados, { name: 'Ureia (45% N)', qty: `${fmtInt(recommendation.cobertura.quantidadeTotal)} kg`, cost: recommendation.cobertura.custoEstimado });
    if (recommendation.correcaoPotassio.k2oCorrecao > 0) {
      addInsumos(recommendation.correcaoPotassio.insumosSelecionados, { name: 'KCl 60%', qty: `${fmtInt(recommendation.correcaoPotassio.quantidadeTotal)} kg`, cost: recommendation.correcaoPotassio.custoEstimado });
    }
    recommendation.micronutrientes.insumosSelecionados.forEach(i => shopItems.push({ name: i.nome, qty: `${fmt(i.quantidadePorHa)} ${i.unidade}/ha`, cost: i.custoTotal }));
    if (usedSeed) shopItems.push({ name: `${usedSeed.name} (${usedSeed.company})`, qty: `${seedBags} saco(s)`, cost: seedCost });

    const microBalance = [
      { label: 'B', full: 'Boro', need: recommendation.micronutrientes.bNecessario, got: recommendation.micronutrientes.bFornecido, color: COLORS.teal },
      { label: 'Zn', full: 'Zinco', need: recommendation.micronutrientes.znNecessario, got: recommendation.micronutrientes.znFornecido, color: COLORS.blue },
      { label: 'Cu', full: 'Cobre', need: recommendation.micronutrientes.cuNecessario, got: recommendation.micronutrientes.cuFornecido, color: COLORS.orange },
      { label: 'Mn', full: 'Manganês', need: recommendation.micronutrientes.mnNecessario, got: recommendation.micronutrientes.mnFornecido, color: COLORS.purple },
      { label: 'Fe', full: 'Ferro', need: recommendation.micronutrientes.feNecessario, got: recommendation.micronutrientes.feFornecido, color: '#6b7280' },
    ];

    const vTarget = 70;
    const vPercent = soilData.vPercent;
    const vStatus = vPercent >= 60 ? 'Adequado' : vPercent >= 40 ? 'Abaixo do Ideal' : 'Crítico';
    const vColor = vPercent >= 60 ? COLORS.primary : vPercent >= 40 ? COLORS.alertYellow : COLORS.alertRed;

    const coberturaTotalKgHa = recommendation.cobertura.insumosSelecionados.length > 0
      ? recommendation.cobertura.insumosSelecionados.reduce((sum, i) => sum + i.quantidadePorHa, 0)
      : recommendation.cobertura.quantidadePorHa;
    const coberturaDetail = recommendation.cobertura.insumosSelecionados.length > 1
      ? recommendation.cobertura.insumosSelecionados.map(i => `~${fmtInt(i.quantidadePorHa)}kg ${i.nome}`).join(' + ')
      : '';

    const stepBase = recommendation.calagem.necessaria ? 1 : 0;
    const operationalSteps: {
      step: string; title: string; icon: string; product: string;
      dose: string; when: string; how: string; color: string;
    }[] = [];

    if (recommendation.calagem.necessaria) {
      operationalSteps.push({
        step: '1º', title: 'CALAGEM — CORREÇÃO DE SOLO', icon: '🪨',
        product: recommendation.calagem.produto, color: '#6b4226',
        dose: `${fmt(recommendation.calagem.ncPorHa)} t/ha (Total: ${fmt(recommendation.calagem.quantidadeTotal)} t para ${hectares} ha)`,
        when: 'Aplicar 60-90 dias ANTES do plantio. Ideal entre Junho e Agosto.',
        how: `Distribuir ${fmt(recommendation.calagem.ncPorHa)} t/ha a lanço. Incorporar com grade aradora até 20 cm. Em V% < 40%, dividir em duas aplicações.`,
      });
    }

    operationalSteps.push({
      step: `${stepBase + 1}º`, title: 'ADUBAÇÃO DE PLANTIO — NO SULCO', icon: '🌱',
      product: recommendation.adubacaoPlantio.insumosSelecionados.length > 0
        ? recommendation.adubacaoPlantio.insumosSelecionados.map(i => i.nome).join(' + ')
        : `NPK ${recommendation.adubacaoPlantio.formulaSugerida}`,
      color: COLORS.primary,
      dose: `${fmtInt(recommendation.adubacaoPlantio.quantidadePorHa)} kg/ha (Total: ${fmtInt(recommendation.adubacaoPlantio.quantidadeTotal)} kg). N ${fmtInt(recommendation.adubacaoPlantio.nNecessario)}, P₂O₅ ${fmtInt(recommendation.adubacaoPlantio.p2o5Necessario)}, K₂O ${fmtInt(recommendation.adubacaoPlantio.k2oNecessario)} kg/ha.`,
      when: 'No dia do plantio, diretamente no sulco de semeadura.',
      how: 'Regulagem da plantadeira: 5 cm ao lado e 5 cm abaixo da semente. Calibre com o adubo que será usado.',
    });

    const parc = recommendation.parcelamentoCobertura;
    const texLabel = recommendation.texturaEstimada === 'arenosa' ? '🏜️ Arenoso' : recommendation.texturaEstimada === 'argilosa' ? '🧱 Argiloso' : '🌱 Média';
    let coberturaWhen = '';
    if (recommendation.texturaEstimada === 'arenosa') {
      coberturaWhen = `${parc.parcelas}x (${texLabel}): V2 15%=${fmtInt(coberturaTotalKgHa * 0.15)}kg · V4 30%=${fmtInt(coberturaTotalKgHa * 0.30)}kg · V6 30%=${fmtInt(coberturaTotalKgHa * 0.30)}kg · V8 25%=${fmtInt(coberturaTotalKgHa * 0.25)}kg`;
    } else if (recommendation.texturaEstimada === 'argilosa') {
      coberturaWhen = `${parc.parcelas}x (${texLabel}): V4 40%=${fmtInt(coberturaTotalKgHa * 0.40)}kg · V8 60%=${fmtInt(coberturaTotalKgHa * 0.60)}kg`;
    } else {
      coberturaWhen = `${parc.parcelas}x (${texLabel}): V2 20%=${fmtInt(coberturaTotalKgHa * 0.20)}kg · V4 40%=${fmtInt(coberturaTotalKgHa * 0.40)}kg · V8 40%=${fmtInt(coberturaTotalKgHa * 0.40)}kg`;
    }

    operationalSteps.push({
      step: `${stepBase + 2}º`, title: 'COBERTURA — N + S', icon: '🧪',
      product: recommendation.cobertura.insumosSelecionados.length > 0
        ? recommendation.cobertura.insumosSelecionados.map(i => i.nome).join(' + ')
        : 'Ureia (45% N)',
      color: COLORS.blue,
      dose: coberturaDetail
        ? `${fmtInt(coberturaTotalKgHa)} kg/ha (${coberturaDetail}) — meta ${fmtInt(recommendation.cobertura.nCobertura)} kg N/ha.`
        : `${fmtInt(coberturaTotalKgHa)} kg/ha (N: ${fmtInt(recommendation.cobertura.nCobertura)} kg/ha)`,
      when: coberturaWhen,
      how: `A lanço entre fileiras. ${recommendation.texturaEstimada === 'arenosa' ? 'Solo arenoso: doses menores e frequentes. ' : ''}Aplicar final da tarde ou antes de chuva leve.`,
    });

    if (recommendation.correcaoPotassio.k2oCorrecao > 0) {
      operationalSteps.push({
        step: `${stepBase + 3}º`, title: 'CORREÇÃO K₂O — KCl', icon: '⚡',
        product: recommendation.correcaoPotassio.insumosSelecionados.length > 0
          ? recommendation.correcaoPotassio.insumosSelecionados.map(i => i.nome).join(' + ') : 'KCl 60%',
        color: COLORS.orange,
        dose: `${fmtInt(recommendation.correcaoPotassio.quantidadePorHa)} kg/ha (K₂O: ${fmtInt(recommendation.correcaoPotassio.k2oCorrecao)} kg/ha)`,
        when: 'Parcelar: parte no plantio, restante na 1ª cobertura (V4).',
        how: 'Distribuir a lanço. KCl é solúvel — será incorporado pelas chuvas. Em arenosos, parcelamento obrigatório.',
      });
    }

    if (recommendation.micronutrientes.insumosSelecionados.length > 0) {
      const soloMicros = recommendation.micronutrientes.insumosSelecionados.filter(i =>
        i.nome.toLowerCase().includes('fte') || i.nome.toLowerCase().includes('boro') || i.nome.toLowerCase().includes('bórax')
      );
      const foliarMicros = recommendation.micronutrientes.insumosSelecionados.filter(i =>
        !i.nome.toLowerCase().includes('fte') && !i.nome.toLowerCase().includes('boro') && !i.nome.toLowerCase().includes('bórax')
      );
      const stepNum = stepBase + (recommendation.correcaoPotassio.k2oCorrecao > 0 ? 4 : 3);
      operationalSteps.push({
        step: `${stepNum}º`, title: 'MICRONUTRIENTES', icon: '🔬',
        product: recommendation.micronutrientes.insumosSelecionados.map(i => i.nome).join(', '),
        color: COLORS.teal,
        dose: recommendation.micronutrientes.insumosSelecionados.map(i => `${i.nome}: ${fmt(i.quantidadePorHa)} ${i.unidade}/ha`).join(' | '),
        when: [
          soloMicros.length > 0 ? `Solo (${soloMicros.map(i => i.nome).join(', ')}): no sulco de plantio.` : '',
          foliarMicros.length > 0 ? `Foliar (${foliarMicros.map(i => i.nome).join(', ')}): V6, V8 e pré-pendoamento.` : '',
        ].filter(Boolean).join(' '),
        how: 'Solo: misturar ao adubo de plantio. Foliar: diluir conforme bula, bicos de média pressão, horas frescas.',
      });
    }

    const totalPages = 3;

    return (
      <div ref={ref} style={{ backgroundColor: COLORS.bg }}>
        {/* ═══ PÁGINA 1 — RESUMO + DIAGNÓSTICO ═══ */}
        <div style={PAGE}>
          {/* HEADER com Logo */}
          <div style={{
            backgroundColor: COLORS.primaryDark, borderRadius: '8px', padding: '12px 16px',
            marginBottom: '10px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={LOGO_URL} alt="Solo V3" style={{ height: '42px', objectFit: 'contain' }} />
              <div>
                <div style={{ fontSize: '9px', fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                  RECOMENDAÇÃO AGRONÔMICA — MILHO SILAGEM
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '7px', opacity: 0.7, textTransform: 'uppercase' }}>Investimento</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 }}>R$ {fmt(totalWithSeed)}</div>
                  </div>
                  <div style={{ borderLeft: '1px solid rgba(255,255,255,0.3)', paddingLeft: '12px' }}>
                    <div style={{ fontSize: '7px', opacity: 0.7, textTransform: 'uppercase' }}>R$/ha</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, lineHeight: 1 }}>R$ {fmt(perHaWithSeed)}</div>
                  </div>
                  <div style={{ borderLeft: '1px solid rgba(255,255,255,0.3)', paddingLeft: '12px' }}>
                    <div style={{ fontSize: '7px', opacity: 0.7, textTransform: 'uppercase' }}>R$/ton</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, lineHeight: 1 }}>R$ {fmt(costPerTon)}</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '8px', lineHeight: 1.8 }}>
              <div><span style={{ opacity: 0.7 }}>Data:</span> <strong>{today}</strong></div>
              <div><span style={{ opacity: 0.7 }}>Área:</span> <strong>{hectares} ha</strong></div>
              <div><span style={{ opacity: 0.7 }}>Meta:</span> <strong>{nivel.label}</strong></div>
              {telefone && <div><span style={{ opacity: 0.7 }}>Tel:</span> <strong>{telefone}</strong></div>}
              {enderecoPropriedade && <div><span style={{ opacity: 0.7 }}>Local:</span> <strong>{enderecoPropriedade}</strong></div>}
            </div>
          </div>

          {/* DIAGNÓSTICO + V% side by side */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <div style={{ ...CARD, flex: 1, marginBottom: 0 }}>
              <div style={SECTION_TITLE}>🧪 Diagnóstico do Solo</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: COLORS.surface }}>
                    <th style={{ textAlign: 'left', padding: '3px 6px', fontWeight: 700, color: COLORS.primary, fontSize: '7.5px', textTransform: 'uppercase' }}>Atributo</th>
                    <th style={{ textAlign: 'center', padding: '3px 6px', fontWeight: 700, color: COLORS.primary, fontSize: '7.5px' }}>Valor</th>
                    <th style={{ textAlign: 'right', padding: '3px 6px', fontWeight: 700, color: COLORS.primary, fontSize: '7.5px' }}>Unidade</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { attr: 'Cálcio (Ca)', val: soilData.ca, unit: 'cmolc/dm³' },
                    { attr: 'Magnésio (Mg)', val: soilData.mg, unit: 'cmolc/dm³' },
                    { attr: 'Potássio (K)', val: soilData.k, unit: 'mg/dm³' },
                    { attr: 'H+Al', val: soilData.hAl, unit: 'cmolc/dm³' },
                    { attr: 'Fósforo (P)', val: soilData.p, unit: 'mg/dm³' },
                    { attr: 'Matéria Orgânica', val: soilData.mo, unit: 'g/dm³' },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                      <td style={{ padding: '3px 6px', color: COLORS.textSecondary, fontWeight: 500 }}>{row.attr}</td>
                      <td style={{ textAlign: 'center', padding: '3px 6px', fontWeight: 700 }}>{row.val}</td>
                      <td style={{ textAlign: 'right', padding: '3px 6px', color: COLORS.textMuted, fontSize: '7.5px' }}>{row.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* V% compact */}
            <div style={{ ...CARD, width: '160px', marginBottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ ...SECTION_TITLE, width: '100%', fontSize: '8px' }}>📊 V% Saturação</div>
              <div style={{ position: 'relative', width: '100px', height: '58px', marginTop: '4px', marginBottom: '2px' }}>
                <svg viewBox="0 0 120 70" style={{ width: '100%', height: '100%' }}>
                  <path d="M 10 65 A 55 55 0 0 1 110 65" fill="none" stroke="#e5e7eb" strokeWidth="10" strokeLinecap="round" />
                  <path d="M 10 65 A 55 55 0 0 1 110 65" fill="none" stroke={vColor} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${(Math.min(vPercent, 100) / 100) * 172} 172`} />
                </svg>
                <div style={{ position: 'absolute', bottom: '0', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: vColor, lineHeight: 1 }}>{vPercent.toFixed(1)}%</div>
                </div>
              </div>
              <div style={{ fontSize: '7px', color: COLORS.textMuted }}>Meta: {vTarget}%</div>
              <div style={{
                marginTop: '4px', padding: '2px 8px', borderRadius: '10px', fontSize: '7.5px', fontWeight: 700,
                backgroundColor: vPercent >= 60 ? '#dcfce7' : vPercent >= 40 ? COLORS.alertYellowBg : COLORS.alertRedBg,
                color: vColor,
              }}>
                {vPercent < 60 ? '⚠' : '✓'} {vStatus}
              </div>
            </div>
          </div>

          {/* TEXTURA ESTIMADA - compact */}
          {(() => {
            const moVal = soilData.mo;
            if (moVal <= 0) return null;
            const textura = moVal < 15 ? 'arenosa' : moVal <= 30 ? 'media' : 'argilosa';
            const texConfig: Record<string, { bg: string; border: string; color: string; emoji: string; label: string; tip: string }> = {
              arenosa: { bg: '#fffbeb', border: '#fbbf24', color: '#92400e', emoji: '🏜️', label: 'ARENOSA', tip: 'Mais parcelamento (4x). Atenção ao Boro. P₂O₅ -10%.' },
              media: { bg: '#ecfdf5', border: '#34d399', color: '#065f46', emoji: '🌱', label: 'MÉDIA', tip: 'Dose padrão de P. Parcelamento em 3 vezes.' },
              argilosa: { bg: '#fff1f2', border: '#fb7185', color: '#9f1239', emoji: '🧱', label: 'ARGILOSA', tip: 'Parcelamento 2x. P₂O₅ +25% por fixação.' },
            };
            const tc = texConfig[textura];
            return (
              <div style={{
                ...CARD, backgroundColor: tc.bg, borderColor: tc.border,
                display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px',
              }}>
                <span style={{ fontSize: '14px' }}>{tc.emoji}</span>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: tc.color }}>{tc.label}</span>
                  <span style={{ fontSize: '8px', color: COLORS.textSecondary, marginLeft: '8px' }}>{tc.tip}</span>
                  <span style={{ fontSize: '7px', color: COLORS.textMuted, marginLeft: '6px', fontStyle: 'italic' }}>M.O.={soilData.mo.toFixed(1)} g/dm³</span>
                </div>
              </div>
            );
          })()}

          {/* LISTA DE COMPRAS */}
          <div style={{ ...CARD }}>
            <div style={SECTION_TITLE}>🛒 Lista de Compras</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5px' }}>
              <thead>
                <tr style={{ backgroundColor: COLORS.primaryDark, color: '#fff' }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 700, fontSize: '8px', borderRadius: '3px 0 0 0' }}>Produto</th>
                  <th style={{ textAlign: 'center', padding: '4px 8px', fontWeight: 700, fontSize: '8px' }}>Quantidade</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 700, fontSize: '8px', borderRadius: '0 3px 0 0' }}>Custo (R$)</th>
                </tr>
              </thead>
              <tbody>
                {shopItems.map((item, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${COLORS.borderLight}`, backgroundColor: i % 2 === 0 ? COLORS.bg : COLORS.surface }}>
                    <td style={{ padding: '3px 8px', fontWeight: 600 }}>{item.name}</td>
                    <td style={{ textAlign: 'center', padding: '3px 8px', color: COLORS.textSecondary }}>{item.qty}</td>
                    <td style={{ textAlign: 'right', padding: '3px 8px', fontWeight: 700 }}>R$ {fmt(item.cost)}</td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: COLORS.primaryDark, color: '#fff' }}>
                  <td colSpan={2} style={{ padding: '5px 8px', fontWeight: 800, fontSize: '9px', borderRadius: '0 0 0 3px' }}>TOTAL GERAL</td>
                  <td style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 800, fontSize: '12px', borderRadius: '0 0 3px 0' }}>R$ {fmt(totalWithSeed)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* MACRONUTRIENTES - row */}
          <div style={{ ...CARD }}>
            <div style={SECTION_TITLE}>🌿 Macronutrientes (kg/ha)</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { label: 'N', value: recommendation.cobertura.nNecessario, color: COLORS.blue },
                { label: 'P₂O₅', value: recommendation.adubacaoPlantio.p2o5Necessario, color: COLORS.purple },
                { label: 'K₂O', value: recommendation.correcaoPotassio.k2oNecessario, color: COLORS.orange },
                { label: 'S', value: recommendation.cobertura.sNecessario, color: COLORS.teal },
              ].map(n => (
                <div key={n.label} style={{ flex: 1, textAlign: 'center', padding: '6px 2px', backgroundColor: COLORS.surface, borderRadius: '6px', border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: '7px', color: COLORS.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>{n.label}</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: n.color }}>{fmtInt(n.value)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* MICRONUTRIENTES - same row format with status */}
          <div style={{ ...CARD }}>
            <div style={SECTION_TITLE}>🔬 Micronutrientes (g/ha)</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {microBalance.map(m => {
                const needG = m.need * 1000;
                const gotG = m.got * 1000;
                const ok = gotG >= needG * 0.8;
                return (
                  <div key={m.label} style={{ flex: 1, textAlign: 'center', padding: '5px 2px', backgroundColor: ok ? '#f0fdf4' : COLORS.alertYellowBg, borderRadius: '6px', border: `1px solid ${ok ? '#bbf7d0' : '#fde68a'}` }}>
                    <div style={{ fontSize: '7px', color: COLORS.textMuted, fontWeight: 700 }}>{m.label}</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: m.color }}>{fmtInt(needG)}</div>
                    <div style={{ fontSize: '6.5px', color: COLORS.textMuted }}>forn: {fmtInt(gotG)}</div>
                    <div style={{
                      fontSize: '6.5px', fontWeight: 700, marginTop: '2px',
                      color: ok ? COLORS.primary : COLORS.alertYellow,
                    }}>
                      {ok ? '✓ OK' : '⚠ Déficit'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COMPOSIÇÃO DO INVESTIMENTO */}
          <div style={{ ...CARD, marginBottom: 0 }}>
            <div style={SECTION_TITLE}>💰 Composição do Investimento</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {costRows.map((row, i) => {
                const pct = totalWithSeed > 0 ? (row.value / totalWithSeed) * 100 : 0;
                return (
                  <div key={i} style={{ flex: '1 1 calc(33% - 6px)', minWidth: '80px', backgroundColor: COLORS.surface, borderRadius: '4px', padding: '5px 8px', border: `1px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: '7px', color: COLORS.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>{row.label}</div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: COLORS.primaryDark }}>{fmt(row.value)}</div>
                    <div style={{ fontSize: '6.5px', color: COLORS.textMuted }}>{pct.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
            {/* KPI */}
            <div style={{ marginTop: '6px', backgroundColor: COLORS.primaryDark, borderRadius: '4px', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#fff', fontSize: '8px', fontWeight: 700 }}>📊 CUSTO / TONELADA</div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '6.5px', textTransform: 'uppercase' }}>Meta</div>
                  <div style={{ color: '#fff', fontSize: '11px', fontWeight: 800 }}>{fmtInt(avgTonHa)} t/ha</div>
                </div>
                <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.3)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '6.5px', textTransform: 'uppercase' }}>Custo</div>
                  <div style={{ color: '#fff', fontSize: '14px', fontWeight: 800 }}>R$ {fmt(costPerTon)}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={FOOTER(1, totalPages)}>
            <span>Fontes: EMBRAPA, ESALQ/USP, IAC — Boletim 100</span>
            <span>Solo V3 · Página 1/{totalPages}</span>
          </div>
        </div>

        {/* ═══ PÁGINA 2 — GUIA OPERACIONAL ═══ */}
        <div style={{ ...PAGE, pageBreakBefore: 'always' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `2px solid ${COLORS.primary}`, paddingBottom: '8px', marginBottom: '10px' }}>
            <img src={LOGO_URL} alt="Solo V3" style={{ height: '28px', objectFit: 'contain' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.primary }}>📋 GUIA OPERACIONAL</div>
              <div style={{ fontSize: '8px', color: COLORS.textMuted }}>Linha do Tempo — Quando e Como Realizar Cada Etapa · {today} · {hectares} ha</div>
            </div>
          </div>

          <div style={{ position: 'relative', paddingLeft: '20px' }}>
            <div style={{ position: 'absolute', left: '9px', top: '4px', bottom: '4px', width: '2px', backgroundColor: COLORS.border }} />

            {operationalSteps.map((step, idx) => (
              <div key={idx} style={{ position: 'relative', marginBottom: '10px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div style={{
                  position: 'absolute', left: '-20px', top: '0px', width: '20px', height: '20px',
                  borderRadius: '50%', backgroundColor: step.color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '8px', fontWeight: 800, zIndex: 1, border: `2px solid ${COLORS.bg}`,
                  boxShadow: `0 0 0 1.5px ${step.color}`,
                }}>
                  {step.step.replace('º', '')}
                </div>

                <div style={{ border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${step.color}`, borderRadius: '6px', padding: '8px 10px', backgroundColor: COLORS.bg }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px' }}>{step.icon}</span>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 800, color: COLORS.text, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{step.title}</div>
                      <div style={{ fontSize: '7.5px', color: COLORS.textMuted }}>{step.product}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '8px' }}>
                    <div style={{ backgroundColor: COLORS.surfaceWarm, borderRadius: '4px', padding: '6px 8px', border: `1px solid ${COLORS.border}` }}>
                      <div style={{ fontSize: '7px', fontWeight: 800, color: COLORS.accent, textTransform: 'uppercase', marginBottom: '2px' }}>📦 DOSE</div>
                      <div style={{ color: COLORS.text, lineHeight: 1.4, wordBreak: 'break-word' }}>{step.dose}</div>
                    </div>
                    <div style={{ backgroundColor: COLORS.alertYellowBg, borderRadius: '4px', padding: '6px 8px', border: '1px solid #fde68a' }}>
                      <div style={{ fontSize: '7px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', marginBottom: '2px' }}>📅 QUANDO</div>
                      <div style={{ color: COLORS.text, lineHeight: 1.4, wordBreak: 'break-word' }}>{step.when}</div>
                    </div>
                    <div style={{ backgroundColor: '#ecfdf5', borderRadius: '4px', padding: '6px 8px', gridColumn: '1 / -1', border: '1px solid #a7f3d0' }}>
                      <div style={{ fontSize: '7px', fontWeight: 800, color: COLORS.primary, textTransform: 'uppercase', marginBottom: '2px' }}>🔧 COMO</div>
                      <div style={{ color: COLORS.text, lineHeight: 1.4, wordBreak: 'break-word' }}>{step.how}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* PLANEJAMENTO DE COBERTURA EFICIENTE */}
          {(() => {
            const totalNCob = recommendation.cobertura.nCobertura;
            if (totalNCob <= 0) return null;

            const texture = recommendation.texturaEstimada;
            const isArenoso = texture === 'arenosa';
            const totalK2O = recommendation.adubacaoPlantio.k2oNecessario + recommendation.correcaoPotassio.k2oCorrecao;
            const K_PLANTIO_MAX = 60;
            const kAtPlanting = Math.min(totalK2O, K_PLANTIO_MAX);
            const kRemaining = Math.max(0, totalK2O - kAtPlanting);
            const kAtV4 = isArenoso ? kRemaining : 0;
            const kclV4 = kAtV4 > 0 ? kAtV4 / 0.6 : 0;
            const nV4 = totalNCob * 0.35;
            const nV8 = totalNCob * 0.65;
            const hasSulfurIssue = recommendation.cobertura.sFornecido < recommendation.cobertura.sNecessario * 0.8;

            // Build cover sources from selected insumos
            interface CoverSrc { nome: string; nConc: number; nContrib: number; pV4: number; pV8: number; }
            const coverSources: CoverSrc[] = [];
            const insWithN = recommendation.cobertura.insumosSelecionados.filter(i => (i.nutrientesFornecidos?.n || 0) > 0);
            let totalNIns = 0;
            insWithN.forEach(i => { totalNIns += i.quantidadePorHa * ((i.nutrientesFornecidos?.n || 0) / 100); });
            if (insWithN.length > 0) {
              insWithN.forEach(i => {
                const nPct = i.nutrientesFornecidos?.n || 0;
                const nConc = nPct / 100;
                const nProv = i.quantidadePorHa * nConc;
                const prop = totalNIns > 0 ? nProv / totalNIns : 1 / insWithN.length;
                coverSources.push({ nome: i.nome, nConc, nContrib: totalNCob * prop, pV4: nConc > 0 ? (nV4 * prop) / nConc : 0, pV8: nConc > 0 ? (nV8 * prop) / nConc : 0 });
              });
            } else {
              const fb = hasSulfurIssue ? { n: 'Sulfato de Amônio', c: 0.21 } : { n: 'Ureia', c: 0.45 };
              coverSources.push({ nome: fb.n, nConc: fb.c, nContrib: totalNCob, pV4: nV4 / fb.c, pV8: nV8 / fb.c });
            }

            const kStrategyText = isArenoso && kRemaining > 0
              ? `${kAtPlanting.toFixed(0)} kg K₂O no Plantio + ${kAtV4.toFixed(0)} kg K₂O em V3-V4 (parcelamento obrigatório em solo arenoso)`
              : kRemaining > 0
              ? `${kAtPlanting.toFixed(0)} kg K₂O no Plantio + ${kRemaining.toFixed(0)} kg K₂O em V3 (excede limite seguro no plantio)`
              : `${totalK2O.toFixed(0)} kg K₂O total no Plantio (dentro do limite seguro)`;

            return (
              <div style={{ ...CARD, marginTop: '10px', border: `1.5px solid ${COLORS.primary}`, borderRadius: '6px' }}>
                <div style={{ ...SECTION_TITLE, color: COLORS.primary }}>⏱️ Planejamento de Cobertura Eficiente</div>
                <div style={{ fontSize: '7.5px', color: COLORS.textMuted, marginBottom: '8px' }}>
                  Cronograma inteligente — Fracionamento N 35/65% (V3-V4 / V6-V8)
                </div>

                {hasSulfurIssue && (
                  <div style={{ backgroundColor: COLORS.alertYellowBg, border: '1px solid #fde68a', borderRadius: '4px', padding: '5px 8px', marginBottom: '8px', fontSize: '8px', color: '#92400e' }}>
                    ⚠️ Enxofre baixo — priorizando Sulfato de Amônio para repor S simultaneamente.
                  </div>
                )}

                {/* Timeline compact */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  {[
                    { phase: 'Plantio', items: [`K₂O: ${kAtPlanting.toFixed(0)} kg/ha`, 'NPK conforme plantio'], color: COLORS.accent },
                    { phase: 'V3-V4 (35% N)', items: [
                      ...coverSources.map(s => `${s.nome}: ${s.pV4.toFixed(0)} kg/ha`),
                      ...(kAtV4 > 0 ? [`KCl: ${kclV4.toFixed(0)} kg/ha`] : []),
                    ], color: COLORS.primary },
                    { phase: 'V6-V8 (65% N)', items: coverSources.map(s => `${s.nome}: ${s.pV8.toFixed(0)} kg/ha`), color: COLORS.blue },
                  ].map((p, i) => (
                    <div key={i} style={{ flex: 1, border: `1px solid ${COLORS.border}`, borderTop: `3px solid ${p.color}`, borderRadius: '4px', padding: '6px 8px', backgroundColor: COLORS.surface }}>
                      <div style={{ fontSize: '8px', fontWeight: 800, color: p.color, marginBottom: '4px' }}>{p.phase}</div>
                      {p.items.map((item, j) => (
                        <div key={j} style={{ fontSize: '7.5px', color: COLORS.text, lineHeight: 1.5 }}>• {item}</div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Conversion table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px', marginBottom: '6px' }}>
                  <thead>
                    <tr style={{ backgroundColor: COLORS.primaryDark, color: '#fff' }}>
                      <th style={{ textAlign: 'left', padding: '3px 6px', fontSize: '7.5px', borderRadius: '3px 0 0 0' }}>Fase</th>
                      <th style={{ textAlign: 'right', padding: '3px 6px', fontSize: '7.5px' }}>N (kg/ha)</th>
                      {coverSources.map((s, i) => (
                        <th key={i} style={{ textAlign: 'right', padding: '3px 6px', fontSize: '7.5px' }}>{s.nome}</th>
                      ))}
                      {kAtV4 > 0 && <th style={{ textAlign: 'right', padding: '3px 6px', fontSize: '7.5px', borderRadius: '0 3px 0 0' }}>KCl</th>}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                      <td style={{ padding: '3px 6px', fontWeight: 600 }}>V3-V4</td>
                      <td style={{ textAlign: 'right', padding: '3px 6px' }}>{nV4.toFixed(1)}</td>
                      {coverSources.map((s, i) => (
                        <td key={i} style={{ textAlign: 'right', padding: '3px 6px', fontWeight: 700, color: COLORS.primary }}>{s.pV4.toFixed(0)} kg/ha</td>
                      ))}
                      {kAtV4 > 0 && <td style={{ textAlign: 'right', padding: '3px 6px', fontWeight: 700, color: COLORS.primary }}>{kclV4.toFixed(0)} kg/ha</td>}
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                      <td style={{ padding: '3px 6px', fontWeight: 600 }}>V6-V8</td>
                      <td style={{ textAlign: 'right', padding: '3px 6px' }}>{nV8.toFixed(1)}</td>
                      {coverSources.map((s, i) => (
                        <td key={i} style={{ textAlign: 'right', padding: '3px 6px', fontWeight: 700, color: COLORS.primary }}>{s.pV8.toFixed(0)} kg/ha</td>
                      ))}
                      {kAtV4 > 0 && <td style={{ textAlign: 'right', padding: '3px 6px' }}>—</td>}
                    </tr>
                    <tr style={{ backgroundColor: COLORS.surface, fontWeight: 700 }}>
                      <td style={{ padding: '3px 6px' }}>Total</td>
                      <td style={{ textAlign: 'right', padding: '3px 6px' }}>{totalNCob.toFixed(1)}</td>
                      {coverSources.map((s, i) => (
                        <td key={i} style={{ textAlign: 'right', padding: '3px 6px', color: COLORS.primary }}>{(s.pV4 + s.pV8).toFixed(0)} kg/ha</td>
                      ))}
                      {kAtV4 > 0 && <td style={{ textAlign: 'right', padding: '3px 6px', color: COLORS.primary }}>{kclV4.toFixed(0)} kg/ha</td>}
                    </tr>
                  </tbody>
                </table>

                {/* K Strategy */}
                <div style={{ backgroundColor: COLORS.surface, borderRadius: '4px', padding: '5px 8px', border: `1px solid ${COLORS.border}`, fontSize: '8px' }}>
                  <span style={{ fontWeight: 700, color: COLORS.primary }}>🛡️ Estratégia K₂O:</span>{' '}
                  <span style={{ color: COLORS.textSecondary }}>{kStrategyText}</span>
                </div>
              </div>
            );
          })()}

          <div style={FOOTER(2, totalPages)}>
            <span>Fontes: EMBRAPA, ESALQ/USP, IAC — Boletim 100</span>
            <span>Solo V3 · Página 2/{totalPages}</span>
          </div>
        </div>

        {/* ═══ PÁGINA 3 — ALERTAS E OBSERVAÇÕES ═══ */}
        <div style={{ ...PAGE, pageBreakBefore: 'always' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `2px solid ${COLORS.primary}`, paddingBottom: '8px', marginBottom: '10px' }}>
            <img src={LOGO_URL} alt="Solo V3" style={{ height: '28px', objectFit: 'contain' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.primary }}>⚠️ ALERTAS E OBSERVAÇÕES</div>
              <div style={{ fontSize: '8px', color: COLORS.textMuted }}>Informações Críticas para o Manejo da Safra</div>
            </div>
          </div>

          {/* ALERTA K SILAGEM */}
          <div style={{
            backgroundColor: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: '6px',
            padding: '10px 12px', marginBottom: '10px', pageBreakInside: 'avoid',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <div style={{ fontSize: '9px', fontWeight: 800, color: '#92400e', textTransform: 'uppercase' }}>ATENÇÃO: REPOSIÇÃO DE POTÁSSIO PARA SILAGEM</div>
            </div>
            <div style={{ fontSize: '8.5px', color: '#78350f', lineHeight: 1.6 }}>
              Meta alta ({'>'} 60 t/ha). A extração de K₂O pela planta inteira é <strong>muito superior</strong> à dose de {fmtInt(recommendation.correcaoPotassio.k2oCorrecao)} kg/ha recomendada. Esta dose visa o <strong>mínimo econômico</strong> e <strong>não repõe a extração total</strong>.
              <br /><strong>🔍 Análise de solo anual OBRIGATÓRIA.</strong>
            </div>
          </div>

          {vPercent < 60 && (
            <div style={{
              backgroundColor: COLORS.alertRedBg, border: `1.5px solid ${COLORS.alertRed}`, borderRadius: '6px',
              padding: '10px 12px', marginBottom: '10px', pageBreakInside: 'avoid',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px' }}>🔴</span>
                <div style={{ fontSize: '9px', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>V% ABAIXO DO IDEAL — {vPercent.toFixed(1)}%</div>
              </div>
              <div style={{ fontSize: '8.5px', color: '#7f1d1d', lineHeight: 1.6 }}>
                V% em <strong>{vPercent.toFixed(1)}%</strong>, abaixo de 60%. Calagem <strong>indispensável</strong> com 60+ dias de antecedência.
              </div>
            </div>
          )}

          {/* OBSERVAÇÕES */}
          <div style={{ ...CARD }}>
            <div style={SECTION_TITLE}>📝 Observações Técnicas</div>
            <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '8.5px', color: COLORS.textSecondary, lineHeight: 1.7 }}>
              {recommendation.observacoes.map((obs, i) => (
                <li key={i} style={{ marginBottom: '2px' }}>{obs}</li>
              ))}
              {vPercent < 60 && (
                <li>V% de {vPercent.toFixed(1)}% abaixo da faixa ideal (60-70%). Priorizar calagem.</li>
              )}
              {usedSeed && (
                <li>Semente: <strong>{usedSeed.name}</strong> ({usedSeed.company}) — {seedBags} saco(s), R$ {fmt(usedSeed.price)}/saco.</li>
              )}
            </ul>
          </div>

          {/* EPI */}
          <div style={{
            backgroundColor: COLORS.alertRedBg, border: `1.5px solid #fca5a5`, borderRadius: '6px',
            padding: '10px 12px', marginBottom: '16px', pageBreakInside: 'avoid',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '14px' }}>🛡️</span>
              <div style={{ fontSize: '9px', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>Segurança — EPI Obrigatório</div>
            </div>
            <div style={{ fontSize: '8.5px', color: '#7f1d1d', lineHeight: 1.6 }}>
              Use <strong>sempre</strong> EPI completo durante manipulação e aplicação de insumos. Siga as instruções da bula. Em caso de intoxicação, procure atendimento médico imediato.
            </div>
          </div>

          {/* ASSINATURAS */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '16px', marginTop: '20px' }}>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ borderBottom: `2px solid ${COLORS.text}`, marginBottom: '4px', height: '30px' }} />
              <div style={{ fontSize: '8.5px', fontWeight: 700 }}>Responsável Técnico</div>
              <div style={{ fontSize: '8.5px', fontWeight: 600, marginTop: '2px' }}>{consultorName || 'SOLO V3'}</div>
              {consultorName && <div style={{ fontSize: '7.5px', color: COLORS.textMuted }}>{consultorCreaArt || 'CREA / ART nº ___________'}</div>}
            </div>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ borderBottom: `2px solid ${COLORS.text}`, marginBottom: '4px', height: '30px' }} />
              <div style={{ fontSize: '8.5px', fontWeight: 700 }}>Produtor</div>
              <div style={{ fontSize: '7.5px', color: COLORS.textMuted }}>CPF: ___.___.___-__</div>
            </div>
          </div>

          {/* RODAPÉ FINAL */}
          <div style={{
            borderTop: `1.5px solid ${COLORS.primary}`, paddingTop: '8px',
            fontSize: '7.5px', color: COLORS.textMuted, lineHeight: 1.7, marginTop: 'auto',
          }}>
            <div style={{ marginBottom: '3px' }}>
              <strong style={{ color: COLORS.text }}>Aviso Legal:</strong> Estimativa técnica baseada nos dados informados e tabelas EMBRAPA, ESALQ/USP, IAC (Boletim 100). Validar com Engenheiro Agrônomo habilitado.
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Gerado automaticamente — Solo V3</span>
              <span>Solo V3 · Página 3/{totalPages}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

InvestmentSheet.displayName = 'InvestmentSheet';
export default InvestmentSheet;
