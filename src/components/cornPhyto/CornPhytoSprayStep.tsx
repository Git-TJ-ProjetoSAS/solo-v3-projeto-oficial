import { useRef, useState } from 'react';
import { useCornPhyto, type CornPhytoAppMode, type CornPhytoFertiEquip } from '@/contexts/CornPhytoContext';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CornPhytoReport } from './CornPhytoReport';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserRole } from '@/hooks/useUserRole';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import {
  Tractor, PlaneTakeoff, Backpack, Droplets, DollarSign, AlertTriangle,
  Clock, ShieldAlert, Scale, FileWarning, FileText, Share2, Loader2,
  FlaskConical, CircleDot, Sprout,
} from 'lucide-react';

type EquipType = 'costal' | 'tratorizado' | 'drone';

const EQUIP_CONFIG: Record<EquipType, {
  label: string; icon: React.ElementType; volumeDefault: number; tanqueDefault: number; tanqueLabel: string;
}> = {
  costal: { label: 'Pulverizador Costal', icon: Backpack, volumeDefault: 200, tanqueDefault: 20, tanqueLabel: 'Capacidade (L)' },
  tratorizado: { label: 'Tratorizado (Barras)', icon: Tractor, volumeDefault: 150, tanqueDefault: 600, tanqueLabel: 'Capacidade do Tanque (L)' },
  drone: { label: 'Drone Agrícola', icon: PlaneTakeoff, volumeDefault: 12, tanqueDefault: 20, tanqueLabel: 'Capacidade por Voo (L)' },
};

const FERTI_CONFIG: { type: CornPhytoFertiEquip; icon: React.ElementType; label: string; desc: string; color: string; tankDefault: number }[] = [
  { type: 'pivo', icon: CircleDot, label: 'Pivô Central', desc: 'Quimigação via pivô', color: 'text-blue-400', tankDefault: 1000 },
  { type: 'gotejo', icon: Sprout, label: 'Gotejamento', desc: 'Injeção por gotejo', color: 'text-emerald-400', tankDefault: 500 },
  { type: 'aspersao', icon: Droplets, label: 'Aspersão', desc: 'Reservatório convencional', color: 'text-cyan-400', tankDefault: 300 },
];

const FERTI_EQUIP_LABELS: Record<CornPhytoFertiEquip, string> = {
  pivo: 'Pivô Central', gotejo: 'Gotejamento', aspersao: 'Aspersão',
};

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function CornPhytoSprayStep() {
  const { data, setData } = useCornPhyto();
  const { profile } = useUserProfile();
  const { isConsultor } = useUserRole();
  const reportRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const { sprayCalc, areaHa, opcoes, selectedOpcaoIndex, matchedPest } = data;
  const produto = sprayCalc.produtoSelecionado;
  const selectedOpcao = selectedOpcaoIndex !== null ? opcoes[selectedOpcaoIndex] : null;
  const isFertigation = sprayCalc.mode === 'fertirrigacao';

  const equip = EQUIP_CONFIG[sprayCalc.equipamento];

  const handleModeChange = (mode: CornPhytoAppMode) => {
    setData(prev => ({ ...prev, sprayCalc: { ...prev.sprayCalc, mode } }));
  };

  const handleEquipChange = (eq: EquipType) => {
    const config = EQUIP_CONFIG[eq];
    setData(prev => ({
      ...prev,
      sprayCalc: { ...prev.sprayCalc, equipamento: eq, volumeCalda: config.volumeDefault, capacidadeTanque: config.tanqueDefault },
    }));
  };

  const handleFertiEquipChange = (eq: CornPhytoFertiEquip) => {
    const config = FERTI_CONFIG.find(f => f.type === eq)!;
    setData(prev => ({
      ...prev,
      sprayCalc: { ...prev.sprayCalc, fertiEquipamento: eq, fertiTankCapacity: config.tankDefault },
    }));
  };

  // ─── PDF Generation ───
  const handleGeneratePDF = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      await new Promise(r => setTimeout(r, 500));
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', width: 794, windowWidth: 794,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = 210, pageH = 297;
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let y = 0, page = 0;
      while (y < imgH) { if (page > 0) pdf.addPage(); pdf.addImage(imgData, 'PNG', 0, -y, imgW, imgH); y += pageH; page++; }
      const prefix = isFertigation ? 'fertirrigacao-milho' : 'fitossanidade-milho';
      pdf.save(`${prefix}-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Erro ao gerar PDF');
    } finally { setGenerating(false); }
  };

  // ─── Share ───
  const handleShare = async () => {
    if (!selectedOpcao || !produto) return;
    const metodo = isFertigation ? FERTI_EQUIP_LABELS[sprayCalc.fertiEquipamento] : EQUIP_CONFIG[sprayCalc.equipamento].label;
    const text = [
      `🌽 *Receituário Fitossanitário — Milho Silagem*`,
      ``, `📋 *Diagnóstico:* ${selectedOpcao.praga} (${selectedOpcao.nomeCientifico})`,
      `⚠️ *Severidade:* ${selectedOpcao.severidade}`,
      ``, `💊 *Produto:* ${produto.nome} (${produto.principioAtivo})`,
      `📏 *Dose:* ${sprayCalc.doseHa} ${produto.unidadeDose}`,
      `🕐 *Carência Silagem:* ${produto.carenciaSilagem} dias`,
      ``, `🚜 *Método:* ${metodo} (${isFertigation ? 'Fertirrigação' : 'Pulverização'})`,
      `📐 *Área:* ${areaHa} ha`,
      ...(isFertigation
        ? [`💧 *Tanque:* ${sprayCalc.fertiTankCapacity} L`]
        : [`💧 *Volume Total:* ${(areaHa * sprayCalc.volumeCalda).toLocaleString()} L`]),
      ``, `_Gerado via SOLO V3_`,
    ].join('\n');

    if (navigator.share) {
      try { await navigator.share({ title: 'Receituário Fitossanitário', text }); } catch { /* cancelled */ }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  // ─── Calculations ───
  const doseUnit = produto?.unidadeDose || 'mL/ha';
  let totalProduto = sprayCalc.doseHa * areaHa;
  let totalLabel = doseUnit.replace('/ha', '');
  if ((totalLabel === 'mL' || totalLabel === 'g') && totalProduto >= 1000) {
    totalProduto /= 1000;
    totalLabel = totalLabel === 'mL' ? 'L' : 'Kg';
  }

  // Spray-specific
  const volumeCaldaTotal = areaHa * sprayCalc.volumeCalda;
  const tanquesNecessarios = sprayCalc.capacidadeTanque > 0 ? Math.ceil(volumeCaldaTotal / sprayCalc.capacidadeTanque) : 0;
  const areaPorTanque = sprayCalc.volumeCalda > 0 ? sprayCalc.capacidadeTanque / sprayCalc.volumeCalda : 0;
  let produtoPorTanque = sprayCalc.doseHa * areaPorTanque;
  let produtoPorTanqueLabel = doseUnit.replace('/ha', '');
  if (produtoPorTanqueLabel === 'mL' && produtoPorTanque >= 1000) { produtoPorTanque /= 1000; produtoPorTanqueLabel = 'L'; }
  if (produtoPorTanqueLabel === 'g' && produtoPorTanque >= 1000) { produtoPorTanque /= 1000; produtoPorTanqueLabel = 'Kg'; }

  // Ferti-specific
  const fertiTotalProduto = sprayCalc.doseHa * areaHa; // in original unit
  const fertiCaixas = sprayCalc.fertiTankCapacity > 0 ? Math.max(1, Math.ceil(fertiTotalProduto / (sprayCalc.fertiTankCapacity * 0.8))) : 1;
  const fertiProdutoPorCaixa = fertiCaixas > 0 ? fertiTotalProduto / fertiCaixas : 0;
  let fertiPorCaixaLabel = doseUnit.replace('/ha', '');
  let fertiPorCaixaValue = fertiProdutoPorCaixa;
  if ((fertiPorCaixaLabel === 'mL' || fertiPorCaixaLabel === 'g') && fertiPorCaixaValue >= 1000) {
    fertiPorCaixaValue /= 1000;
    fertiPorCaixaLabel = fertiPorCaixaLabel === 'mL' ? 'L' : 'Kg';
  }

  // Cost
  const custoProdutoTotal = produto && produto.tamanhoEmbalagem > 0
    ? (sprayCalc.doseHa * areaHa / (doseUnit.includes('mL') ? 1000 : doseUnit.includes('g') ? 1000 : 1)) / produto.tamanhoEmbalagem * produto.precoEstimado
    : 0;

  return (
    <div className="space-y-5" style={{ animation: 'fade-in 0.3s ease-out' }}>
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
          {isFertigation ? <Droplets className="w-7 h-7 text-primary" /> : <FlaskConical className="w-7 h-7 text-primary" />}
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-1">
          {isFertigation ? 'Fertirrigação' : 'Calculadora de Calda'}
        </h2>
        <p className="text-sm text-muted-foreground">Preparo e aplicação para {areaHa} hectares</p>
      </div>

      {/* Diagnosis summary */}
      {selectedOpcao && (
        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">{selectedOpcao.praga}</p>
            <p className="text-xs text-muted-foreground">{produto?.nome || 'Sem produto selecionado'} — {produto?.principioAtivo}</p>
          </div>
        </div>
      )}

      {/* ═══ MODE SELECTOR ═══ */}
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Tipo de Aplicação</p>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => handleModeChange('pulverizacao')}
            className={cn('p-4 rounded-xl border-2 text-center transition-all',
              !isFertigation ? 'border-primary bg-primary/5 scale-[1.02] shadow-md' : 'border-border bg-card hover:border-primary/30')}>
            <FlaskConical className={cn('w-7 h-7 mx-auto mb-2', !isFertigation ? 'text-primary' : 'text-muted-foreground')} />
            <p className="text-sm font-bold text-foreground">Pulverização</p>
            <p className="text-[10px] text-muted-foreground mt-1">Trator, Drone ou Costal</p>
          </button>
          <button type="button" onClick={() => handleModeChange('fertirrigacao')}
            className={cn('p-4 rounded-xl border-2 text-center transition-all',
              isFertigation ? 'border-primary bg-primary/5 scale-[1.02] shadow-md' : 'border-border bg-card hover:border-primary/30')}>
            <Droplets className={cn('w-7 h-7 mx-auto mb-2', isFertigation ? 'text-primary' : 'text-muted-foreground')} />
            <p className="text-sm font-bold text-foreground">Fertirrigação</p>
            <p className="text-[10px] text-muted-foreground mt-1">Pivô, Gotejo ou Aspersão</p>
          </button>
        </div>
      </div>

      {/* ═══ EQUIPMENT SELECTION ═══ */}
      {!isFertigation ? (
        <div>
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Equipamento</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(EQUIP_CONFIG) as EquipType[]).map(eq => {
              const config = EQUIP_CONFIG[eq];
              const isActive = sprayCalc.equipamento === eq;
              return (
                <button key={eq} type="button" onClick={() => handleEquipChange(eq)}
                  className={cn('p-3 rounded-xl border flex flex-col items-center gap-2 transition-all',
                    isActive ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30')}>
                  <config.icon className={cn('w-6 h-6', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  <span className="text-[10px] font-medium text-foreground text-center leading-tight">{config.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Equipamento de Fertirrigação</p>
          <div className="grid grid-cols-3 gap-2">
            {FERTI_CONFIG.map(fc => {
              const isActive = sprayCalc.fertiEquipamento === fc.type;
              return (
                <button key={fc.type} type="button" onClick={() => handleFertiEquipChange(fc.type)}
                  className={cn('p-3 rounded-xl border flex flex-col items-center gap-2 transition-all',
                    isActive ? 'border-primary bg-primary/5 scale-[1.03] shadow-sm' : 'border-border bg-card hover:border-primary/30')}>
                  <fc.icon className={cn('w-6 h-6', isActive ? fc.color : 'text-muted-foreground')} />
                  <span className="text-[10px] font-medium text-foreground text-center leading-tight">{fc.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Parameters */}
      {!isFertigation ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Volume de Calda (L/ha)</p>
            <Input type="number" value={sprayCalc.volumeCalda}
              onChange={e => setData(prev => ({ ...prev, sprayCalc: { ...prev.sprayCalc, volumeCalda: Number(e.target.value) || 0 } }))}
              className="text-center font-medium" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{equip.tanqueLabel}</p>
            <Input type="number" value={sprayCalc.capacidadeTanque}
              onChange={e => setData(prev => ({ ...prev, sprayCalc: { ...prev.sprayCalc, capacidadeTanque: Number(e.target.value) || 0 } }))}
              className="text-center font-medium" />
          </div>
        </div>
      ) : (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Capacidade do Tanque/Caixa (L)</p>
          <Input type="number" value={sprayCalc.fertiTankCapacity}
            onChange={e => setData(prev => ({ ...prev, sprayCalc: { ...prev.sprayCalc, fertiTankCapacity: Number(e.target.value) || 0 } }))}
            className="text-center font-medium" />
        </div>
      )}

      {/* Dose */}
      {produto && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            Dose de {produto.nome} ({doseUnit})
          </p>
          <Input type="number" value={sprayCalc.doseHa}
            onChange={e => setData(prev => ({ ...prev, sprayCalc: { ...prev.sprayCalc, doseHa: Number(e.target.value) || 0 } }))}
            className="text-center font-medium" />
          <p className="text-[10px] text-muted-foreground mt-1">Faixa: {produto.dose}</p>
        </div>
      )}

      {/* ═══ RESULT CARD ═══ */}
      <div className="p-5 rounded-2xl border-2 border-primary/30 bg-primary/5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Scale className="w-5 h-5 text-primary" />
          <p className="text-sm font-bold text-foreground uppercase tracking-wider">
            {isFertigation ? 'Receita de Fertirrigação' : 'Receita de Preparo'}
          </p>
        </div>

        {!isFertigation ? (
          /* ── Spraying results ── */
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl bg-secondary/50">
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Volume Total de Calda</p>
                <p className="text-lg font-bold text-foreground">{volumeCaldaTotal.toLocaleString()} L</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-secondary/50">
                <p className="text-[10px] text-muted-foreground uppercase mb-1">
                  {sprayCalc.equipamento === 'costal' ? 'Bombas' : sprayCalc.equipamento === 'drone' ? 'Voos' : 'Tanques'}
                </p>
                <p className="text-lg font-bold text-foreground">{tanquesNecessarios}</p>
              </div>
            </div>
            {produto && (
              <div className="p-3 rounded-xl bg-foreground text-background">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium">Produto Total ({areaHa} ha)</p>
                  <p className="text-lg font-bold">{totalProduto.toFixed(2)} {totalLabel}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">
                    Por {sprayCalc.equipamento === 'costal' ? 'Bomba' : sprayCalc.equipamento === 'drone' ? 'Voo' : 'Tanque'} ({sprayCalc.capacidadeTanque}L)
                  </p>
                  <p className="text-lg font-bold">{produtoPorTanque.toFixed(2)} {produtoPorTanqueLabel}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ── Fertigation results ── */
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl bg-secondary/50">
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Caixas Necessárias</p>
                <p className="text-lg font-bold text-foreground">{fertiCaixas}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-secondary/50">
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Volume/Caixa</p>
                <p className="text-lg font-bold text-foreground">{sprayCalc.fertiTankCapacity} L</p>
              </div>
            </div>
            {produto && (
              <div className="p-3 rounded-xl bg-foreground text-background">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium">Produto Total ({areaHa} ha)</p>
                  <p className="text-lg font-bold">{totalProduto.toFixed(2)} {totalLabel}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Por Caixa ({sprayCalc.fertiTankCapacity}L)</p>
                  <p className="text-lg font-bold">{fertiPorCaixaValue.toFixed(2)} {fertiPorCaixaLabel}</p>
                </div>
              </div>
            )}
          </>
        )}

        {produto && (
          <>
            {/* Cost */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Custo Estimado</span>
              </div>
              <span className="text-sm font-bold">{fmtCurrency(custoProdutoTotal)}</span>
            </div>

            {/* Carência */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-amber-400" />
                <p className="text-xs font-semibold text-foreground">Carência para Silagem</p>
              </div>
              <p className="text-sm font-bold text-amber-400">{produto.carenciaSilagem} dias</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Não colher para silagem antes de {produto.carenciaSilagem} dias após a aplicação.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Legal disclaimer */}
      <div className="p-4 rounded-2xl border border-border bg-card">
        <div className="flex items-start gap-3">
          <FileWarning className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">Aviso Legal</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Esta é uma ferramenta de suporte à decisão. A compra e aplicação de defensivos agrícolas exige 
              emissão de Receituário Agronômico por um Engenheiro Agrônomo responsável (Lei 7.802/1989). 
              Consulte sempre um profissional habilitado.
            </p>
          </div>
        </div>
      </div>

      {/* ═══ PDF / SHARE BUTTONS ═══ */}
      <div className="grid grid-cols-2 gap-3">
        <Button size="lg" onClick={handleGeneratePDF} disabled={generating || !produto} className="gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          {generating ? 'Gerando...' : 'Gerar PDF'}
        </Button>
        <Button size="lg" variant="outline" onClick={handleShare} disabled={!produto} className="gap-2">
          <Share2 className="w-4 h-4" /> Compartilhar
        </Button>
      </div>

      {/* Hidden report for PDF capture */}
      <div style={{ position: 'fixed', left: -9999, top: 0, zIndex: -1 }}>
        <CornPhytoReport ref={reportRef} data={data} profileName={profile?.full_name || null} creaArt={profile?.crea_art || null} isConsultor={isConsultor} />
      </div>
    </div>
  );
}
