import { forwardRef } from 'react';
import { LOGO_URL } from '@/lib/constants';
import type { SprayRecipe } from '@/data/cornPhenologyManagement';
import { TIPO_PRODUTO_LABELS } from '@/data/cornPhenologyManagement';
import type { EquipmentType } from '@/types/spraying';

export interface SprayingReportData {
  faseLabel: string;
  faseIcon: string;
  acao: string;
  detalhe: string;
  observacao: string;
  volumeCaldaRecomendado: string;
  equipmentType: EquipmentType;
  tankCapacity: number;
  applicationRate: number;
  hectares: number;
  numberOfTanks: number;
  areaPorTanque: number;
  volumeTotalCalda: number;
  applicationCost: number;
  costPerHa: number;
  totalProductCost: number;
  mode?: 'pulverizacao' | 'fertirrigacao';
  equipmentLabel?: string;
  products: {
    recipe: SprayRecipe;
    doseNumeric: number;
    unit: string;
    perTank: number;
    totalArea: number;
    productCost: number;
    matchedInsumo?: { nome: string; preco: number; tamanho_unidade: number; medida: string } | null;
  }[];
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fmtQty(val: number, unit: string): string {
  if (unit.includes('Kg')) {
    if (val < 1) return `${(val * 1000).toFixed(0)} g`;
    return `${val.toFixed(2)} kg`;
  }
  if (val < 0.1) return `${(val * 1000).toFixed(0)} mL`;
  return `${val.toFixed(2)} L`;
}

/* ─── Design Tokens (same as InvestmentSheet) ─── */
const C = {
  primary: '#2d6a4f',
  primaryDark: '#1b4332',
  bg: '#ffffff',
  surface: '#f9faf8',
  border: '#d5dbd4',
  borderLight: '#e8ece7',
  text: '#1a1a1a',
  textSecondary: '#4a5a4a',
  textMuted: '#7a8a7a',
  blue: '#2563eb',
  orange: '#ea580c',
  purple: '#7c3aed',
  teal: '#0d9488',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#f59e0b',
};

const TIPO_COLORS: Record<string, string> = {
  herbicida: C.orange,
  inseticida: C.red,
  fungicida: C.purple,
  foliar: C.green,
  adjuvante: C.blue,
  dessecante: C.yellow,
  tratamento_semente: C.teal,
};

const PAGE: React.CSSProperties = {
  width: '210mm', minHeight: '297mm', maxWidth: '210mm', margin: '0 auto',
  padding: '10mm 12mm', fontFamily: "'Inter','Roboto','Segoe UI',system-ui,sans-serif",
  fontSize: '9px', lineHeight: 1.5, color: C.text, backgroundColor: C.bg,
  boxSizing: 'border-box',
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, color: C.primary, textTransform: 'uppercase',
  letterSpacing: '0.8px', marginBottom: '8px', paddingBottom: '4px',
  borderBottom: `1.5px solid ${C.primary}`, display: 'flex', alignItems: 'center', gap: '6px',
};

const CARD: React.CSSProperties = {
  border: `1px solid ${C.border}`, borderRadius: '6px', padding: '10px 12px', marginBottom: '10px',
  backgroundColor: C.bg, pageBreakInside: 'avoid', breakInside: 'avoid',
};

const EQUIP_LABELS: Record<EquipmentType, string> = { trator: 'Trator (Barra)', drone: 'Drone', bomba_costal: 'Bomba Costal' };

const CornSprayingReport = forwardRef<HTMLDivElement, { data: SprayingReportData }>(
  ({ data }, ref) => {
    const today = new Date().toLocaleDateString('pt-BR');
    const isFertigation = data.mode === 'fertirrigacao';
    const tankLabel = isFertigation ? 'caixa' : (data.equipmentType === 'bomba_costal' ? 'bomba' : data.equipmentType === 'drone' ? 'voo' : 'tanque');
    const equipLabel = data.equipmentLabel || EQUIP_LABELS[data.equipmentType];
    const reportTitle = isFertigation ? 'Receita de Fertirrigação' : 'Receita de Pulverização';

    return (
      <div ref={ref} style={{ backgroundColor: C.bg }}>
        <div style={PAGE}>
          {/* ═══ HEADER ═══ */}
          <div style={{
            backgroundColor: C.primaryDark, borderRadius: '8px', padding: '14px 18px',
            marginBottom: '14px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <img src={LOGO_URL} alt="Solo V3" style={{ height: '42px', objectFit: 'contain' }} />
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', opacity: 0.9 }}>
                  {reportTitle}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '4px' }}>
                  {data.faseIcon} {data.faseLabel}
                </div>
                <div style={{ fontSize: '8.5px', opacity: 0.7, marginTop: '2px' }}>
                  {data.acao}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '8.5px', lineHeight: 1.8 }}>
              <div><span style={{ opacity: 0.7 }}>Data:</span> <strong>{today}</strong></div>
              <div><span style={{ opacity: 0.7 }}>Área:</span> <strong>{data.hectares} ha</strong></div>
              <div><span style={{ opacity: 0.7 }}>Equipamento:</span> <strong>{equipLabel}</strong></div>
            </div>
          </div>

          {/* ═══ RESUMO OPERACIONAL ═══ */}
          <div style={CARD}>
            <div style={SECTION_TITLE}>⚙️ Resumo Operacional</div>
            <div style={{ display: 'flex', gap: '0', border: `1px solid ${C.borderLight}`, borderRadius: '6px', overflow: 'hidden' }}>
              {(isFertigation ? [
                { label: 'Equipamento', value: equipLabel },
                { label: 'Reservatório', value: `${data.tankCapacity} L` },
                { label: `Nº ${tankLabel}s`, value: `${data.numberOfTanks}` },
                { label: `Área/${tankLabel}`, value: `${data.areaPorTanque.toFixed(1)} ha` },
                { label: 'Área Total', value: `${data.hectares} ha` },
              ] : [
                { label: 'Equipamento', value: equipLabel },
                { label: 'Tanque', value: `${data.tankCapacity} L` },
                { label: 'Taxa Aplicação', value: `${data.applicationRate} L/ha` },
                { label: 'Volume Total', value: `${data.volumeTotalCalda.toLocaleString()} L` },
                { label: `Nº ${tankLabel}s`, value: `${data.numberOfTanks}` },
                { label: `Área/${tankLabel}`, value: `${data.areaPorTanque.toFixed(1)} ha` },
              ]).map((item, i) => (
                <div key={i} style={{
                  flex: 1, textAlign: 'center', padding: '8px 4px',
                  borderRight: i < 5 ? `1px solid ${C.borderLight}` : 'none',
                  backgroundColor: i % 2 === 0 ? C.surface : C.bg,
                }}>
                  <div style={{ fontSize: '7px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: C.primary, marginTop: '3px' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ RECEITA DA CALDA ═══ */}
          <div style={CARD}>
            <div style={SECTION_TITLE}>🧪 Receita da Calda — por {tankLabel.charAt(0).toUpperCase() + tankLabel.slice(1)} ({data.tankCapacity} L)</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
              <thead>
                <tr style={{ backgroundColor: C.surface }}>
                  <th style={{ textAlign: 'left', padding: '5px 8px', fontWeight: 700, color: C.primary, fontSize: '8px', textTransform: 'uppercase' }}>Produto</th>
                  <th style={{ textAlign: 'center', padding: '5px 6px', fontWeight: 700, color: C.primary, fontSize: '8px', textTransform: 'uppercase' }}>Tipo</th>
                  <th style={{ textAlign: 'center', padding: '5px 6px', fontWeight: 700, color: C.primary, fontSize: '8px', textTransform: 'uppercase' }}>Dose/ha</th>
                  <th style={{ textAlign: 'center', padding: '5px 6px', fontWeight: 700, color: C.primary, fontSize: '8px', textTransform: 'uppercase', backgroundColor: '#e8f5e9' }}>
                    Por {tankLabel}
                  </th>
                  <th style={{ textAlign: 'center', padding: '5px 6px', fontWeight: 700, color: C.primary, fontSize: '8px', textTransform: 'uppercase' }}>
                    Total ({data.hectares} ha)
                  </th>
                  {data.totalProductCost > 0 && (
                    <th style={{ textAlign: 'center', padding: '5px 6px', fontWeight: 700, color: C.primary, fontSize: '8px', textTransform: 'uppercase' }}>
                      Custo
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.products.map((calc, idx) => {
                  const tipoCor = TIPO_COLORS[calc.recipe.tipo] || C.textMuted;
                  const isAdj = calc.recipe.tipo === 'adjuvante';
                  return (
                    <tr key={idx} style={{
                      borderBottom: `1px solid ${C.borderLight}`,
                      backgroundColor: isAdj ? '#eff6ff' : idx % 2 === 0 ? C.bg : C.surface,
                    }}>
                      <td style={{ padding: '6px 8px' }}>
                        <div style={{ fontWeight: 600, color: C.text }}>{calc.recipe.produto}</div>
                        {calc.matchedInsumo && calc.matchedInsumo.nome.toLowerCase() !== calc.recipe.produto.toLowerCase() && (
                          <div style={{ fontSize: '7px', color: C.primary, marginTop: '1px' }}>🔗 {calc.matchedInsumo.nome}</div>
                        )}
                        <div style={{ fontSize: '7.5px', color: C.textMuted, marginTop: '1px' }}>{calc.recipe.funcao}</div>
                        {!calc.matchedInsumo && (
                          <div style={{ fontSize: '7px', color: C.orange, marginTop: '1px' }}>⚠ Sem insumo vinculado</div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', padding: '6px' }}>
                        <span style={{
                          display: 'inline-block', fontSize: '7px', fontWeight: 700, padding: '2px 6px',
                          borderRadius: '4px', color: '#fff', backgroundColor: tipoCor,
                        }}>
                          {TIPO_PRODUTO_LABELS[calc.recipe.tipo] || calc.recipe.tipo}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '6px', fontSize: '8.5px', fontFamily: 'monospace' }}>
                        {calc.recipe.dose}
                      </td>
                      <td style={{
                        textAlign: 'center', padding: '6px', fontWeight: 800, fontSize: '11px',
                        color: C.primary, backgroundColor: '#e8f5e9',
                      }}>
                        {calc.perTank > 0 ? fmtQty(calc.perTank, calc.unit) : '—'}
                      </td>
                      <td style={{ textAlign: 'center', padding: '6px', fontSize: '8.5px', fontFamily: 'monospace', fontWeight: 600 }}>
                        {calc.totalArea > 0 ? fmtQty(calc.totalArea, calc.unit) : '—'}
                      </td>
                      {data.totalProductCost > 0 && (
                        <td style={{ textAlign: 'center', padding: '6px', fontSize: '8.5px', fontWeight: 700, color: calc.productCost > 0 ? C.text : C.textMuted }}>
                          {calc.productCost > 0 ? `R$ ${fmt(calc.productCost)}` : '—'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ═══ SEQUÊNCIA DE PREPARO ═══ */}
          <div style={CARD}>
            <div style={SECTION_TITLE}>📋 Sequência de Preparo da Calda</div>
            <div style={{ fontSize: '9px', color: C.textSecondary, lineHeight: 1.7 }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '6px' }}>
                <span style={{ fontWeight: 800, color: C.primary, fontSize: '10px', minWidth: '18px' }}>1.</span>
                <span>Abastecer o tanque com <strong>50-70%</strong> do volume de água ({Math.round(data.tankCapacity * 0.6)} L).</span>
              </div>
              {data.products.filter(p => p.recipe.tipo !== 'adjuvante').map((calc, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800, color: C.primary, fontSize: '10px', minWidth: '18px' }}>{idx + 2}.</span>
                  <span>
                    Adicionar <strong>{calc.perTank > 0 ? fmtQty(calc.perTank, calc.unit) : calc.recipe.dose}</strong> de{' '}
                    <strong>{calc.recipe.produto}</strong> ({TIPO_PRODUTO_LABELS[calc.recipe.tipo]}).
                    {calc.unit.includes('Kg') ? ' Dissolver completamente antes de adicionar o próximo.' : ' Agitar bem.'}
                  </span>
                </div>
              ))}
              {data.products.filter(p => p.recipe.tipo === 'adjuvante').map((calc, idx) => (
                <div key={`adj-${idx}`} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800, color: C.blue, fontSize: '10px', minWidth: '18px' }}>
                    {data.products.filter(p => p.recipe.tipo !== 'adjuvante').length + 2 + idx}.
                  </span>
                  <span>
                    Adicionar o adjuvante <strong>{calc.recipe.produto}</strong>: <strong>{calc.perTank > 0 ? fmtQty(calc.perTank, calc.unit) : calc.recipe.dose}</strong>.{' '}
                    <em style={{ color: C.textMuted }}>(Sempre por último)</em>
                  </span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 800, color: C.primary, fontSize: '10px', minWidth: '18px' }}>
                  {data.products.length + 2}.
                </span>
                <span>Completar com água até <strong>{data.tankCapacity} L</strong>. Agitar e aplicar imediatamente.</span>
              </div>
            </div>
          </div>

          {/* ═══ OBSERVAÇÕES TÉCNICAS ═══ */}
          {(data.observacao || data.volumeCaldaRecomendado !== 'N/A') && (
            <div style={CARD}>
              <div style={SECTION_TITLE}>⚠️ Observações Técnicas</div>
              {data.volumeCaldaRecomendado && data.volumeCaldaRecomendado !== 'N/A' && (
                <div style={{
                  padding: '8px 10px', backgroundColor: '#eff6ff', borderRadius: '4px',
                  marginBottom: data.observacao ? '8px' : 0, border: `1px solid #bfdbfe`,
                }}>
                  <span style={{ fontWeight: 700, color: C.blue, fontSize: '8px', textTransform: 'uppercase' }}>Volume Recomendado: </span>
                  <span style={{ fontWeight: 600, color: C.text }}>{data.volumeCaldaRecomendado}</span>
                </div>
              )}
              {data.observacao && (
                <div style={{
                  padding: '8px 10px', backgroundColor: '#fffbeb', borderRadius: '4px',
                  border: `1px solid #fde68a`, color: C.textSecondary, fontSize: '8.5px',
                }}>
                  {data.observacao}
                </div>
              )}
            </div>
          )}

          {/* ═══ DETALHAMENTO ═══ */}
          <div style={CARD}>
            <div style={SECTION_TITLE}>📝 Detalhamento da Aplicação</div>
            <p style={{ fontSize: '8.5px', color: C.textSecondary, lineHeight: 1.6 }}>
              {data.detalhe}
            </p>
          </div>

          {/* ═══ CUSTO DOS PRODUTOS ═══ */}
          {data.totalProductCost > 0 && (
            <div style={CARD}>
              <div style={SECTION_TITLE}>🧪 Custo dos Produtos</div>
              <div style={{ display: 'flex', gap: '0', border: `1px solid ${C.borderLight}`, borderRadius: '6px', overflow: 'hidden' }}>
                {[
                  { label: 'Custo Produtos', value: `R$ ${fmt(data.totalProductCost)}`, highlight: false },
                  { label: 'R$/ha', value: `R$ ${fmt(data.hectares > 0 ? data.totalProductCost / data.hectares : 0)}`, highlight: true },
                  { label: `R$/${tankLabel}`, value: `R$ ${fmt(data.totalProductCost / data.numberOfTanks)}`, highlight: false },
                ].map((item, i) => (
                  <div key={i} style={{
                    flex: 1, textAlign: 'center', padding: '10px 6px',
                    borderRight: i < 2 ? `1px solid ${C.borderLight}` : 'none',
                    backgroundColor: item.highlight ? '#e8f5e9' : C.surface,
                  }}>
                    <div style={{ fontSize: '7px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: item.highlight ? C.primary : C.text, marginTop: '4px' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ CUSTO OPERACIONAL ═══ */}
          <div style={CARD}>
            <div style={SECTION_TITLE}>💰 Custo Operacional de Aplicação</div>
            <div style={{ display: 'flex', gap: '0', border: `1px solid ${C.borderLight}`, borderRadius: '6px', overflow: 'hidden' }}>
              {[
                { label: 'Custo Operacional', value: `R$ ${fmt(data.applicationCost)}`, highlight: false },
                { label: 'R$/ha', value: `R$ ${fmt(data.costPerHa)}`, highlight: true },
                { label: `R$/${tankLabel}`, value: `R$ ${fmt(data.applicationCost / data.numberOfTanks)}`, highlight: false },
              ].map((item, i) => (
                <div key={i} style={{
                  flex: 1, textAlign: 'center', padding: '10px 6px',
                  borderRight: i < 2 ? `1px solid ${C.borderLight}` : 'none',
                  backgroundColor: item.highlight ? '#e8f5e9' : C.surface,
                }}>
                  <div style={{ fontSize: '7px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: item.highlight ? C.primary : C.text, marginTop: '4px' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ CUSTO TOTAL GERAL ═══ */}
          {data.totalProductCost > 0 && (() => {
            const totalGeral = data.applicationCost + data.totalProductCost;
            const totalGeralHa = data.hectares > 0 ? totalGeral / data.hectares : 0;
            return (
              <div style={CARD}>
                <div style={SECTION_TITLE}>📊 Custo Total Geral</div>
                <div style={{ display: 'flex', gap: '0', border: `2px solid ${C.primary}`, borderRadius: '6px', overflow: 'hidden' }}>
                  {[
                    { label: 'Total Geral', value: `R$ ${fmt(totalGeral)}` },
                    { label: 'Total R$/ha', value: `R$ ${fmt(totalGeralHa)}` },
                  ].map((item, i) => (
                    <div key={i} style={{
                      flex: 1, textAlign: 'center', padding: '12px 6px',
                      borderRight: i < 1 ? `2px solid ${C.primary}` : 'none',
                      backgroundColor: '#e8f5e9',
                    }}>
                      <div style={{ fontSize: '7px', fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: C.primaryDark, marginTop: '4px' }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ═══ CONDIÇÕES IDEAIS ═══ */}
          <div style={CARD}>
            <div style={SECTION_TITLE}>🌤️ Condições Ideais de Aplicação</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Temperatura', value: '< 30°C', icon: '🌡️' },
                { label: 'Umidade Relativa', value: '> 60%', icon: '💧' },
                { label: 'Vento', value: '3-10 km/h', icon: '🌬️' },
                { label: 'Horário', value: 'Manhã cedo ou fim de tarde', icon: '🕐' },
              ].map((cond, i) => (
                <div key={i} style={{
                  textAlign: 'center', padding: '8px 4px', borderRadius: '6px',
                  border: `1px solid ${C.borderLight}`, backgroundColor: C.surface,
                }}>
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>{cond.icon}</div>
                  <div style={{ fontSize: '7px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase' }}>{cond.label}</div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: C.primary, marginTop: '2px' }}>{cond.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ FOOTER ═══ */}
          <div style={{
            borderTop: `1.5px solid ${C.primary}`, paddingTop: '8px', display: 'flex',
            justifyContent: 'space-between', fontSize: '7.5px', color: C.textMuted, marginTop: '12px',
          }}>
            <span>Solo V3 — {reportTitle} • {today}</span>
            <span>{data.faseLabel} | {equipLabel} | {data.hectares} ha</span>
          </div>
        </div>
      </div>
    );
  }
);

CornSprayingReport.displayName = 'CornSprayingReport';
export { CornSprayingReport };
