import { forwardRef } from 'react';
import type { CornPhytoData } from '@/contexts/CornPhytoContext';
import { LOGO_URL } from '@/lib/constants';

interface CornPhytoReportProps {
  data: CornPhytoData;
  profileName: string | null;
  creaArt: string | null;
  isConsultor: boolean;
}

const EQUIP_LABELS: Record<string, string> = {
  costal: 'Pulverizador Costal',
  tratorizado: 'Tratorizado (Barras)',
  drone: 'Drone Agrícola',
};

const TANQUE_LABELS: Record<string, string> = {
  costal: 'Bomba',
  tratorizado: 'Tanque',
  drone: 'Voo',
};

const FERTI_EQUIP_LABELS: Record<string, string> = {
  pivo: 'Pivô Central',
  gotejo: 'Gotejamento',
  aspersao: 'Aspersão',
};

function fmtNum(v: number, dec = 2) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const CornPhytoReport = forwardRef<HTMLDivElement, CornPhytoReportProps>(
  ({ data, profileName, creaArt, isConsultor }, ref) => {
    const { opcoes, selectedOpcaoIndex, matchedPest, sprayCalc, areaHa } = data;
    const selectedOpcao = selectedOpcaoIndex !== null ? opcoes[selectedOpcaoIndex] : null;
    const produto = sprayCalc.produtoSelecionado;

    if (!selectedOpcao || !produto) return null;

    const isFertigation = sprayCalc.mode === 'fertirrigacao';

    // Spray calculations (mirror CornPhytoSprayStep logic)
    const volumeCaldaTotal = areaHa * sprayCalc.volumeCalda;
    const tanquesNecessarios = sprayCalc.capacidadeTanque > 0
      ? Math.ceil(volumeCaldaTotal / sprayCalc.capacidadeTanque) : 0;

    const doseUnit = produto.unidadeDose || 'mL/ha';
    let totalProduto = sprayCalc.doseHa * areaHa;
    let totalLabel = doseUnit.replace('/ha', '');
    if ((totalLabel === 'mL' || totalLabel === 'g') && totalProduto >= 1000) {
      totalProduto /= 1000;
      totalLabel = totalLabel === 'mL' ? 'L' : 'Kg';
    }

    const areaPorTanque = sprayCalc.volumeCalda > 0 ? sprayCalc.capacidadeTanque / sprayCalc.volumeCalda : 0;
    let produtoPorTanque = sprayCalc.doseHa * areaPorTanque;
    let ptLabel = doseUnit.replace('/ha', '');
    if ((ptLabel === 'mL' && produtoPorTanque >= 1000)) { produtoPorTanque /= 1000; ptLabel = 'L'; }
    if ((ptLabel === 'g' && produtoPorTanque >= 1000)) { produtoPorTanque /= 1000; ptLabel = 'Kg'; }

    // Fertigation calcs
    const fertiTotalRaw = sprayCalc.doseHa * areaHa;
    const fertiCaixas = sprayCalc.fertiTankCapacity > 0 ? Math.max(1, Math.ceil(fertiTotalRaw / (sprayCalc.fertiTankCapacity * 0.8))) : 1;
    let fertiPorCaixa = fertiCaixas > 0 ? fertiTotalRaw / fertiCaixas : 0;
    let fertiPorCaixaLabel = doseUnit.replace('/ha', '');
    if ((fertiPorCaixaLabel === 'mL' || fertiPorCaixaLabel === 'g') && fertiPorCaixa >= 1000) {
      fertiPorCaixa /= 1000;
      fertiPorCaixaLabel = fertiPorCaixaLabel === 'mL' ? 'L' : 'Kg';
    }

    const custoProdutoTotal = produto.tamanhoEmbalagem > 0
      ? (sprayCalc.doseHa * areaHa / (doseUnit.includes('mL') ? 1000 : doseUnit.includes('g') ? 1000 : 1)) / produto.tamanhoEmbalagem * produto.precoEstimado
      : 0;

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    const s: React.CSSProperties = {
      fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
      color: '#1a1a1a',
      background: '#ffffff',
      width: 794,
      padding: '32px 40px',
      fontSize: 11,
      lineHeight: 1.5,
    };

    const headerStyle: React.CSSProperties = {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderBottom: '2px solid #16a34a', paddingBottom: 12, marginBottom: 20,
    };

    const sectionTitle = (num: number, title: string): React.CSSProperties => ({
      fontSize: 12, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' as const,
      letterSpacing: 1.2, marginTop: 18, marginBottom: 8,
      borderBottom: '1px solid #e5e7eb', paddingBottom: 4,
    });

    const cellStyle: React.CSSProperties = {
      padding: '6px 10px', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top',
    };

    const zebraRow = (i: number): React.CSSProperties => ({
      backgroundColor: i % 2 === 0 ? '#f9fafb' : '#ffffff',
    });

    return (
      <div ref={ref} style={s}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>
              Receituário Fitossanitário — Milho Silagem
            </div>
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
              Gerado em {dateStr} • SOLO V3
            </div>
          </div>
          <img src={LOGO_URL} alt="Solo V3" style={{ height: 40, opacity: 0.9 }} crossOrigin="anonymous" />
        </div>

        {/* Captured photo */}
        {data.imageBase64 && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ flex: '0 0 auto' }}>
              <img
                src={data.imageBase64}
                alt="Foto da amostra"
                style={{
                  width: 180, height: 180, objectFit: 'cover',
                  borderRadius: 8, border: '1px solid #d1d5db',
                }}
                crossOrigin="anonymous"
              />
              <div style={{ fontSize: 9, color: '#6b7280', textAlign: 'center', marginTop: 4 }}>
                Foto capturada em campo
              </div>
            </div>
            {selectedOpcao && (
              <div style={{
                flex: 1, padding: '12px 16px', background: '#fef2f2',
                border: '1px solid #fca5a5', borderRadius: 8,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#b91c1c', marginBottom: 4 }}>
                  {selectedOpcao.praga}
                </div>
                <div style={{ fontSize: 10, color: '#6b7280', fontStyle: 'italic', marginBottom: 8 }}>
                  {selectedOpcao.nomeCientifico}
                </div>
                <div style={{ fontSize: 11, color: '#1a1a1a' }}>
                  {selectedOpcao.sintomas}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 1. DIAGNÓSTICO */}
        <div style={sectionTitle(1, '')}>1. Diagnóstico</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['Agente Causador', selectedOpcao.praga],
              ['Nome Científico', selectedOpcao.nomeCientifico],
              ['Tipo', selectedOpcao.tipo === 'praga' ? 'Praga' : selectedOpcao.tipo === 'doenca' ? 'Doença' : selectedOpcao.tipo],
              ['Confiança da IA', `${selectedOpcao.confianca}%`],
              ['Severidade', selectedOpcao.severidade],
              ['Risco para Silagem', selectedOpcao.riscoPerdaSilagem],
              ['Estádio Fenológico', data.estadioFenologico],
              ['Parte Afetada', data.parteAfetada],
              ['Clima Recente', data.climaRecente],
            ].map(([label, value], i) => (
              <tr key={label} style={zebraRow(i)}>
                <td style={{ ...cellStyle, fontWeight: 600, width: '40%' }}>{label}</td>
                <td style={cellStyle}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* NDE */}
        {(selectedOpcao.nde || matchedPest?.nde) && (
          <>
            <div style={sectionTitle(2, '')}>2. Nível de Dano Econômico (NDE)</div>
            <div style={{ padding: '8px 12px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 6, fontSize: 11 }}>
              {selectedOpcao.nde || matchedPest?.nde}
            </div>
          </>
        )}

        {/* 3. RECOMENDAÇÃO */}
        <div style={sectionTitle(3, '')}>3. Produto Recomendado</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['Produto Comercial', produto.nome],
              ['Princípio Ativo', produto.principioAtivo],
              ['Dose Recomendada', `${sprayCalc.doseHa} ${doseUnit}`],
              ['Faixa Registrada', produto.dose],
              ['Carência (Silagem)', `${produto.carenciaSilagem} dias`],
            ].map(([label, value], i) => (
              <tr key={label} style={zebraRow(i)}>
                <td style={{ ...cellStyle, fontWeight: 600, width: '40%' }}>{label}</td>
                <td style={cellStyle}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Carência alert */}
        <div style={{
          marginTop: 10, padding: '10px 14px', background: '#fef2f2', border: '1px solid #ef4444',
          borderRadius: 6, fontSize: 11, color: '#b91c1c', fontWeight: 600,
        }}>
          ⚠ ATENÇÃO: Período de carência de {produto.carenciaSilagem} dias. Não colher para silagem antes deste prazo.
        </div>

        {/* 4. RECEITA DE CALDA / FERTIRRIGAÇÃO */}
        <div style={sectionTitle(4, '')}>4. {isFertigation ? 'Receita de Fertirrigação' : 'Receita de Preparo de Calda'}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {(isFertigation ? [
              ['Tipo de Aplicação', 'Fertirrigação'],
              ['Equipamento', FERTI_EQUIP_LABELS[sprayCalc.fertiEquipamento] || sprayCalc.fertiEquipamento],
              ['Área Total', `${areaHa} ha`],
              ['Capacidade por Caixa', `${sprayCalc.fertiTankCapacity} L`],
              ['Caixas Necessárias', `${fertiCaixas}`],
              ['Produto Total', `${fmtNum(totalProduto)} ${totalLabel}`],
              ['Produto por Caixa', `${fmtNum(fertiPorCaixa)} ${fertiPorCaixaLabel}`],
              ['Custo Estimado', fmtCurrency(custoProdutoTotal)],
            ] : [
              ['Método de Aplicação', EQUIP_LABELS[sprayCalc.equipamento]],
              ['Área Total', `${areaHa} ha`],
              ['Volume de Calda', `${sprayCalc.volumeCalda} L/ha`],
              ['Volume Total', `${fmtNum(volumeCaldaTotal, 0)} L`],
              [`Capacidade por ${TANQUE_LABELS[sprayCalc.equipamento]}`, `${sprayCalc.capacidadeTanque} L`],
              [`${TANQUE_LABELS[sprayCalc.equipamento]}s Necessários`, `${tanquesNecessarios}`],
              ['Produto Total', `${fmtNum(totalProduto)} ${totalLabel}`],
              [`Produto por ${TANQUE_LABELS[sprayCalc.equipamento]}`, `${fmtNum(produtoPorTanque)} ${ptLabel}`],
              ['Custo Estimado', fmtCurrency(custoProdutoTotal)],
            ]).map(([label, value], i) => (
              <tr key={label} style={zebraRow(i)}>
                <td style={{ ...cellStyle, fontWeight: 600, width: '40%' }}>{label}</td>
                <td style={cellStyle}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 5. AVISO LEGAL */}
        <div style={sectionTitle(5, '')}>5. Aviso Legal</div>
        <div style={{
          padding: '10px 14px', background: '#f3f4f6', border: '1px solid #d1d5db',
          borderRadius: 6, fontSize: 10, color: '#4b5563', lineHeight: 1.6,
        }}>
          Esta é uma ferramenta de suporte à decisão. A compra e aplicação de defensivos agrícolas exige emissão de
          Receituário Agronômico por um Engenheiro Agrônomo responsável (Lei 7.802/1989). Consulte sempre um profissional habilitado.
          As doses e produtos indicados são referências técnicas e podem variar conforme condições locais.
        </div>

        {/* Footer — responsável técnico */}
        <div style={{
          marginTop: 24, paddingTop: 12, borderTop: '1px solid #d1d5db',
          display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6b7280',
        }}>
          <div>
            {isConsultor && profileName ? (
              <>
                <div style={{ fontWeight: 600 }}>Responsável Técnico: {profileName}</div>
                {creaArt && <div>CREA/ART: {creaArt}</div>}
              </>
            ) : (
              <div style={{ fontWeight: 600 }}>Gerado via SOLO V3 — Plataforma Agronômica</div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>{dateStr}</div>
          </div>
        </div>
      </div>
    );
  }
);

CornPhytoReport.displayName = 'CornPhytoReport';
