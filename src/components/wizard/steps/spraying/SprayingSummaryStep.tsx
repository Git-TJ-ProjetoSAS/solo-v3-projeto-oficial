import { useState } from 'react';
import { CheckCircle2, Droplets, DollarSign, Tractor, PlaneTakeoff, Backpack, Settings2, ArrowDownToLine, FileDown, Loader2, Share2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWizard } from '@/contexts/WizardContext';
import { calculateApplicationCost, formatQuantity } from '@/types/spraying';
import { LOGO_URL } from '@/lib/constants';
import { toast } from 'sonner';
import { useTalhoes } from '@/hooks/useTalhoes';
import { useTalhaoHistory } from '@/hooks/useTalhaoHistory';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SprayingSummaryStep() {
  const { wizardData } = useWizard();
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedTalhaoId, setSelectedTalhaoId] = useState<string>('');
  const { talhoes } = useTalhoes();
  const { saveWizardToHistory } = useTalhaoHistory(selectedTalhaoId || undefined);
  const spraying = wizardData.spraying;
  const drench = wizardData.drench;

  if (!spraying && !drench) {
    return (
      <div className="text-center py-12">
        <Settings2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Configuração Pendente
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure o equipamento nas etapas anteriores.
        </p>
      </div>
    );
  }

  // Standard spraying calculations
  let applicationCost = 0;
  let volumeTotalCalda = 0;
  let numberOfTanks = 0;
  let areaCoveredPerTank = 0;

  if (spraying) {
    const { equipment, products, hectares, costs } = spraying;
    volumeTotalCalda = equipment.applicationRate * hectares;
    numberOfTanks = Math.ceil(volumeTotalCalda / equipment.tankCapacity);
    areaCoveredPerTank = equipment.tankCapacity / equipment.applicationRate;
    applicationCost = calculateApplicationCost(
      equipment.type, costs, hectares, equipment.tankCapacity, equipment.applicationRate
    );
  }

  // Drench calculations
  let drenchOperationalCost = 0;
  let drenchCostPerHa = 0;
  let drenchTotalHours = 0;
  let drenchTotalPlants = 0;
  let drenchTotalVolumeL = 0;

  if (drench) {
    drenchTotalPlants = drench.populationPerHa * drench.hectares;
    drenchTotalVolumeL = (drench.populationPerHa * drench.volumePerPlantMl / 1000) * drench.hectares;
    const plantsPerHour = drench.equipment === 'costal' ? drench.costalPlantsPerHour : drench.barraPlantsPerHour;
    const costPerHour = drench.equipment === 'costal' ? drench.costalCostPerHour : drench.barraCostPerHour;
    drenchTotalHours = plantsPerHour > 0 ? drenchTotalPlants / plantsPerHour : 0;
    drenchOperationalCost = drenchTotalHours * costPerHour;
    drenchCostPerHa = drench.hectares > 0 ? drenchOperationalCost / drench.hectares : 0;
  }

  const equipmentIcons = {
    trator: Tractor,
    drone: PlaneTakeoff,
    bomba_costal: Backpack,
  };

  const equipmentLabels = {
    trator: 'Trator',
    drone: 'Drone',
    bomba_costal: 'Bomba Costal',
  };

  const drenchEquipmentLabels = {
    costal: 'Pulverizador Costal',
    barra_caneta: 'Barra com Caneta',
  };

  const grandTotal = applicationCost + drenchOperationalCost;
  const totalHectares = spraying?.hectares || drench?.hectares || 1;

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSaveToHistory = async () => {
    if (!selectedTalhaoId) {
      toast.error('Selecione um talhão para salvar');
      return;
    }
    setSaving(true);
    const ok = await saveWizardToHistory(selectedTalhaoId, {
      spraying: spraying ? JSON.parse(JSON.stringify(spraying)) : null,
      drench: drench || null,
      hectares: totalHectares,
      totalCost: grandTotal,
      notes: [
        spraying ? 'Pulverização convencional' : '',
        drench ? 'Drench no colo' : '',
      ].filter(Boolean).join(' + '),
    });
    setSaving(false);
    if (ok) setSaved(true);
  };

  // ── PDF Generation ──
  const generatePDF = async () => {
    setGenerating(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210, mL = 15, mR = 15, cW = W - mL - mR;
      let y = 15;

      // Logo
      try {
        const img = await loadImg(LOGO_URL);
        if (img) doc.addImage(img, 'PNG', mL, y, 20, 20);
      } catch { /* skip */ }
      doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Pulverização', mL + 24, y + 8);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(120);
      doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, mL + 24, y + 14);
      doc.setTextColor(0);
      y += 26;
      doc.setDrawColor(200); doc.line(mL, y, W - mR, y); y += 6;

      // ── Standard Spraying ──
      if (spraying) {
        y = sectionTitle(doc, '1. Pulverização Convencional', mL, y, cW);
        const eqLabel = equipmentLabels[spraying.equipment.type];
        y = kvRow(doc, 'Equipamento', eqLabel, mL, y, cW);
        y = kvRow(doc, 'Capacidade do tanque', `${spraying.equipment.tankCapacity} L`, mL, y, cW);
        y = kvRow(doc, 'Taxa de aplicação', `${spraying.equipment.applicationRate} L/ha`, mL, y, cW);
        y = kvRow(doc, 'Área', `${spraying.hectares} ha`, mL, y, cW);
        y = kvRow(doc, 'Volume total de calda', `${volumeTotalCalda.toLocaleString('pt-BR')} L`, mL, y, cW);
        y = kvRow(doc, 'Tanques necessários', `${numberOfTanks} (${areaCoveredPerTank.toFixed(2)} ha/tanque)`, mL, y, cW);
        y += 2;

        if (spraying.products.length > 0) {
          y = subTitle(doc, 'Mix de Calda', mL, y);
          const tankLabel = spraying.equipment.type === 'bomba_costal' ? 'bomba' : spraying.equipment.type === 'drone' ? 'voo' : 'tanque';
          const headers = ['Produto', 'Dose', `Por ${tankLabel}`];
          const widths = [cW * 0.5, cW * 0.25, cW * 0.25];
          y = tableHeader(doc, headers, widths, mL, y);
          for (const p of spraying.products) {
            y = tableRow(doc, [p.name, `${p.doseInput} ${p.unit}`, formatQuantity(p.quantityPerTank, p.unit)], widths, mL, y);
          }
          y += 3;
        }

        y = highlightRow(doc, 'Custo Aplicação Convencional', `R$ ${fmt(applicationCost)}`, `R$ ${fmt(applicationCost / (spraying.hectares || 1))}/ha`, mL, y, cW);
        y += 6;
      }

      // ── Drench ──
      if (drench && drench.products.length > 0) {
        y = checkPage(doc, y, 60);
        y = sectionTitle(doc, spraying ? '2. Drench no Colo da Planta' : '1. Drench no Colo da Planta', mL, y, cW);
        const eqLabel = drenchEquipmentLabels[drench.equipment];
        y = kvRow(doc, 'Equipamento', eqLabel, mL, y, cW);
        y = kvRow(doc, 'Volume por planta', `${drench.volumePerPlantMl} mL`, mL, y, cW);
        y = kvRow(doc, 'Plantas/ha', drench.populationPerHa.toLocaleString('pt-BR'), mL, y, cW);
        y = kvRow(doc, 'Área', `${drench.hectares} ha`, mL, y, cW);
        y = kvRow(doc, 'Volume total', `${drenchTotalVolumeL.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L`, mL, y, cW);
        y = kvRow(doc, 'Horas estimadas', `${drenchTotalHours.toFixed(1)} h`, mL, y, cW);
        y += 2;

        y = subTitle(doc, 'Produtos no Drench', mL, y);
        const headers = ['Produto', 'Concentração', 'g/planta', 'Total'];
        const widths = [cW * 0.35, cW * 0.2, cW * 0.2, cW * 0.25];
        y = tableHeader(doc, headers, widths, mL, y);
        for (const p of drench.products) {
          const gPlant = p.concentrationGPerL * (drench.volumePerPlantMl / 1000);
          y = tableRow(doc, [p.name, `${p.concentrationGPerL} g/L`, gPlant.toFixed(2), `${p.totalProductKg.toFixed(2)} kg`], widths, mL, y);
        }
        y += 3;

        y = highlightRow(doc, 'Custo Operacional Drench', `R$ ${fmt(drenchOperationalCost)}`, `R$ ${fmt(drenchCostPerHa)}/ha`, mL, y, cW);
        y += 6;
      }

      // ── Grand Total ──
      y = checkPage(doc, y, 20);
      doc.setFillColor(30, 30, 30);
      doc.roundedRect(mL, y, cW, 18, 2, 2, 'F');
      doc.setTextColor(255); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text('CUSTO TOTAL DE APLICAÇÃO', mL + cW / 2, y + 5, { align: 'center' });
      doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      doc.text(`R$ ${fmt(grandTotal)}`, mL + cW / 2, y + 12, { align: 'center' });
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text(`R$ ${fmt(grandTotal / totalHectares)} por hectare`, mL + cW / 2, y + 17, { align: 'center' });
      doc.setTextColor(0);
      y += 24;

      // Footer
      doc.setFontSize(7); doc.setTextColor(150);
      doc.text('Solo V3 — Relatório gerado automaticamente', mL, 290);
      doc.setTextColor(0);

      doc.save('relatorio-pulverizacao.pdf');
      toast.success('PDF exportado com sucesso!');
    } catch (e) {
      console.error('Erro ao gerar PDF:', e);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGenerating(false);
    }
  };

  // ── WhatsApp Share ──
  const shareWhatsApp = () => {
    const lines: string[] = ['🌿 *Relatório de Pulverização*', `📅 ${new Date().toLocaleDateString('pt-BR')}`, ''];

    if (spraying) {
      const eqLabel = equipmentLabels[spraying.equipment.type];
      lines.push('*── Pulverização Convencional ──*');
      lines.push(`▪ Equipamento: ${eqLabel}`);
      lines.push(`▪ Tanque: ${spraying.equipment.tankCapacity} L | Taxa: ${spraying.equipment.applicationRate} L/ha`);
      lines.push(`▪ Área: ${spraying.hectares} ha`);
      lines.push(`▪ Volume total: ${volumeTotalCalda.toLocaleString('pt-BR')} L (${numberOfTanks} tanques)`);
      if (spraying.products.length > 0) {
        lines.push('', '*Mix de Calda:*');
        for (const p of spraying.products) {
          lines.push(`  • ${p.name}: ${p.doseInput} ${p.unit} → ${formatQuantity(p.quantityPerTank, p.unit)}/tanque`);
        }
      }
      lines.push(``, `💰 Custo convencional: *R$ ${fmt(applicationCost)}* (R$ ${fmt(applicationCost / (spraying.hectares || 1))}/ha)`);
    }

    if (drench && drench.products.length > 0) {
      const eqLabel = drenchEquipmentLabels[drench.equipment];
      lines.push('', '*── Drench no Colo ──*');
      lines.push(`▪ Equipamento: ${eqLabel}`);
      lines.push(`▪ Volume/planta: ${drench.volumePerPlantMl} mL | Plantas/ha: ${drench.populationPerHa.toLocaleString('pt-BR')}`);
      lines.push(`▪ Área: ${drench.hectares} ha | Volume total: ${drenchTotalVolumeL.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L`);
      lines.push('', '*Produtos:*');
      for (const p of drench.products) {
        const gPlant = p.concentrationGPerL * (drench.volumePerPlantMl / 1000);
        lines.push(`  • ${p.name}: ${p.concentrationGPerL} g/L (${gPlant.toFixed(2)} g/planta) → Total: ${p.totalProductKg.toFixed(2)} kg`);
      }
      lines.push(``, `💰 Custo drench: *R$ ${fmt(drenchOperationalCost)}* (R$ ${fmt(drenchCostPerHa)}/ha)`);
    }

    lines.push('', `✅ *CUSTO TOTAL: R$ ${fmt(grandTotal)}* (R$ ${fmt(grandTotal / totalHectares)}/ha)`);
    lines.push('', '_Gerado por Solo V3_');

    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Resumo da Pulverização
        </h2>
        <p className="text-sm text-muted-foreground">
          Confira as configurações antes de prosseguir
        </p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={generatePDF}
            disabled={generating}
            className="gap-2"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Exportar PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={shareWhatsApp}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            WhatsApp
          </Button>
        </div>

        {/* Save to History */}
        {talhoes.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <Select value={selectedTalhaoId} onValueChange={setSelectedTalhaoId}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="Selecione o talhão" />
              </SelectTrigger>
              <SelectContent>
                {talhoes.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleSaveToHistory}
              disabled={saving || saved || !selectedTalhaoId}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saved ? 'Salvo ✓' : 'Salvar Histórico'}
            </Button>
          </div>
        )}
      </div>

      {/* Standard Spraying Section */}
      {spraying && (
        <>
          {/* Equipment Summary */}
          <div className="p-4 bg-secondary rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center">
                {(() => { const Icon = equipmentIcons[spraying.equipment.type]; return <Icon className="w-5 h-5 text-background" />; })()}
              </div>
              <div>
                <p className="font-medium text-foreground">{equipmentLabels[spraying.equipment.type]}</p>
                <p className="text-xs text-muted-foreground">Equipamento selecionado</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Tanque</p>
                <p className="font-semibold">{spraying.equipment.tankCapacity} L</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taxa</p>
                <p className="font-semibold">{spraying.equipment.applicationRate} L/ha</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Área</p>
                <p className="font-semibold">{spraying.hectares} ha</p>
              </div>
            </div>
          </div>

          {/* Application Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-secondary rounded-xl text-center">
              <Droplets className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold text-foreground">{volumeTotalCalda.toLocaleString()} L</p>
              <p className="text-xs text-muted-foreground">Volume total de calda</p>
            </div>
            <div className="p-4 bg-secondary rounded-xl text-center">
              <p className="text-2xl font-bold text-foreground">{numberOfTanks}</p>
              <p className="text-xs text-muted-foreground">Tanques necessários</p>
              <p className="text-xs text-muted-foreground mt-1">({areaCoveredPerTank.toFixed(2)} ha/tanque)</p>
            </div>
          </div>

          {/* Products Summary */}
          <div className="p-4 bg-secondary rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Mix de Calda ({spraying.products.length} produtos)</span>
            </div>
            {spraying.products.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto adicionado</p>
            ) : (
              <div className="space-y-3">
                {spraying.products.map(product => {
                  const tankLabel = spraying.equipment.type === 'bomba_costal' ? 'bomba' : spraying.equipment.type === 'drone' ? 'voo' : 'tanque';
                  return (
                    <div key={product.id} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{product.name}</span>
                        <span className="font-medium">{product.doseInput} {product.unit}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs text-muted-foreground">Por {tankLabel}</span>
                        <span className="text-xs font-medium text-primary">{formatQuantity(product.quantityPerTank, product.unit)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Spraying Cost */}
          <div className="p-4 bg-secondary rounded-xl text-center">
            <DollarSign className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Custo Aplicação Convencional</p>
            <p className="text-2xl font-bold text-foreground">R$ {applicationCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">R$ {(applicationCost / (spraying.hectares || 1)).toFixed(2)}/ha</p>
          </div>
        </>
      )}

      {/* Drench Section */}
      {drench && drench.products.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground uppercase tracking-wider">Drench no Colo</span>
          </div>

          {/* Drench Equipment & Params */}
          <div className="p-4 bg-secondary rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center">
                <ArrowDownToLine className="w-5 h-5 text-background" />
              </div>
              <div>
                <p className="font-medium text-foreground">{drenchEquipmentLabels[drench.equipment]}</p>
                <p className="text-xs text-muted-foreground">Aplicação via drench</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Vol/planta</p>
                <p className="font-semibold text-sm">{drench.volumePerPlantMl} mL</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Plantas/ha</p>
                <p className="font-semibold text-sm">{drench.populationPerHa.toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Área</p>
                <p className="font-semibold text-sm">{drench.hectares} ha</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Volume total</p>
                <p className="font-semibold text-sm">{drenchTotalVolumeL.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L</p>
              </div>
            </div>
          </div>

          {/* Drench Products */}
          <div className="p-4 bg-secondary rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Produtos no Drench ({drench.products.length})</span>
            </div>
            <div className="space-y-3">
              {drench.products.map(product => {
                const gPerPlant = product.concentrationGPerL * (drench.volumePerPlantMl / 1000);
                return (
                  <div key={product.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{product.name}</span>
                      <span className="font-medium">{product.concentrationGPerL} g/L</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-muted-foreground">{gPerPlant.toFixed(2)} g/planta</span>
                      <span className="text-xs font-medium text-primary">Total: {product.totalProductKg.toFixed(2)} kg</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Drench Cost */}
          <div className="p-4 bg-secondary rounded-xl text-center">
            <DollarSign className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Custo Operacional Drench</p>
            <p className="text-2xl font-bold text-foreground">R$ {drenchOperationalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground">
              {drenchTotalHours.toFixed(1)}h estimadas • R$ {drenchCostPerHa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/ha
            </p>
          </div>
        </div>
      )}

      {/* Grand Total */}
      <div 
        className="p-6 bg-foreground text-background rounded-xl text-center"
        style={{ animation: 'scale-in 0.2s ease-out' }}
      >
        <CheckCircle2 className="w-8 h-8 mx-auto mb-3" />
        <p className="text-xs uppercase tracking-wider opacity-70 mb-1">
          Custo Total de Aplicação
        </p>
        <p className="text-3xl font-bold mb-1">
          R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        {spraying && drench && drench.products.length > 0 && (
          <p className="text-xs opacity-60 mb-1">
            Convencional: R$ {applicationCost.toFixed(2)} + Drench: R$ {drenchOperationalCost.toFixed(2)}
          </p>
        )}
        <p className="text-sm opacity-80">
          R$ {((spraying?.hectares || drench?.hectares || 1) > 0 ? grandTotal / (spraying?.hectares || drench?.hectares || 1) : 0).toFixed(2)} por hectare
        </p>
      </div>
    </div>
  );
}

// ── jsPDF Helper Functions ──
type Doc = import('jspdf').jsPDF;

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function checkPage(doc: Doc, y: number, need: number): number {
  if (y + need > 280) { doc.addPage(); return 15; }
  return y;
}

function sectionTitle(doc: Doc, text: string, x: number, y: number, w: number): number {
  y = checkPage(doc, y, 12);
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(x, y, w, 8, 1, 1, 'F');
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30);
  doc.text(text, x + 3, y + 5.5);
  doc.setTextColor(0);
  return y + 11;
}

function subTitle(doc: Doc, text: string, x: number, y: number): number {
  y = checkPage(doc, y, 8);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text(text, x, y + 4);
  return y + 7;
}

function kvRow(doc: Doc, label: string, value: string, x: number, y: number, w: number): number {
  y = checkPage(doc, y, 6);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
  doc.text(label, x + 2, y + 4);
  doc.setTextColor(0); doc.setFont('helvetica', 'bold');
  doc.text(value, x + w - 2, y + 4, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  return y + 6;
}

function tableHeader(doc: Doc, headers: string[], widths: number[], x: number, y: number): number {
  y = checkPage(doc, y, 8);
  doc.setFillColor(230, 230, 230);
  doc.rect(x, y, widths.reduce((a, b) => a + b, 0), 6, 'F');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
  let cx = x;
  headers.forEach((h, i) => { doc.text(h, cx + 2, y + 4); cx += widths[i]; });
  return y + 7;
}

function tableRow(doc: Doc, cells: string[], widths: number[], x: number, y: number): number {
  y = checkPage(doc, y, 6);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  let cx = x;
  cells.forEach((c, i) => { doc.text(c, cx + 2, y + 4); cx += widths[i]; });
  doc.setDrawColor(230); doc.line(x, y + 5.5, x + widths.reduce((a, b) => a + b, 0), y + 5.5);
  return y + 6;
}

function highlightRow(doc: Doc, label: string, value: string, sub: string, x: number, y: number, w: number): number {
  y = checkPage(doc, y, 12);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(x, y, w, 10, 1, 1, 'F');
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80);
  doc.text(label, x + 3, y + 4.5);
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
  doc.text(value, x + w - 3, y + 4.5, { align: 'right' });
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(120);
  doc.text(sub, x + w - 3, y + 8.5, { align: 'right' });
  doc.setTextColor(0);
  return y + 13;
}
