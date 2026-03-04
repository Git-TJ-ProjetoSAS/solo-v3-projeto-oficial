import { useRef, useCallback, useMemo } from 'react';
import { useCoffee } from '@/contexts/CoffeeContext';
import type {
  CoffeeFertigationData,
  CoffeeSprayingData,
  CoffeeTreatmentPlanData,
} from '@/contexts/CoffeeContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserRole } from '@/hooks/useUserRole';
import { useTalhoes } from '@/hooks/useTalhoes';
import { Button } from '@/components/ui/button';
import {
  FileDown,
  Printer,
  MessageCircle,
  Share2,
  ShieldAlert,
  Waves,
  Droplets,
  DollarSign,
  Tractor,
  PlaneTakeoff,
  Backpack,
} from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { LOGO_URL } from '@/lib/constants';

// ─── Helpers ─────────────────────────────────────────────────
function normalizeDose(dose: number, unit: string): { value: number; outputUnit: string } {
  switch (unit) {
    case 'mL/ha': return { value: dose / 1000, outputUnit: 'L' };
    case 'g/ha': return { value: dose / 1000, outputUnit: 'Kg' };
    case 'Kg/ha': return { value: dose, outputUnit: 'Kg' };
    default: return { value: dose, outputUnit: 'L' };
  }
}

function formatQty(v: number, unit: string): string {
  if (v < 0.01) return `${(v * 1000).toFixed(1)} ${unit === 'L' ? 'mL' : 'g'}`;
  return `${v.toFixed(2)} ${unit}`;
}

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtNum(v: number, dec = 2) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// ─── WhatsApp Text ───────────────────────────────────────────
function buildWhatsAppText(params: {
  coffeeLabel: string;
  hectares: number;
  treatmentPlan: CoffeeTreatmentPlanData | null;
  fertigation: CoffeeFertigationData | null;
  spraying: CoffeeSprayingData | null;
}) {
  const { coffeeLabel, hectares, treatmentPlan, fertigation, spraying } = params;
  const date = new Date().toLocaleDateString('pt-BR');
  let text = `🛡 *CONTROLE FITOSSANITÁRIO — CAFÉ ${coffeeLabel.toUpperCase()}*\n📅 ${date}\n\n`;

  if (hectares > 0) text += `📐 Área: ${hectares} ha\n\n`;

  if (treatmentPlan && treatmentPlan.entries.length > 0) {
    text += `🎯 *DEFENSIVOS*\n`;
    treatmentPlan.entries.forEach(e => {
      text += `• ${e.produto} (${e.alvo}): ${e.dosePerHa} ${e.unidade}`;
      if (e.costPerHa > 0) text += ` — ${fmtCurrency(e.costPerHa)}/ha`;
      text += '\n';
    });
    text += '\n';
  }

  if (fertigation && fertigation.products.length > 0) {
    text += `💧 *FERTIRRIGAÇÃO* (Caixa ${fertigation.tankSize}L)\n`;
    fertigation.products.forEach(p => {
      text += `• ${p.name}: ${p.dosePerHa} ${p.unit}\n`;
    });
    text += '\n';
  }

  if (spraying && spraying.products.length > 0) {
    text += `🎯 *PULVERIZAÇÃO* (${spraying.tankCapacity}L)\n`;
    spraying.products.forEach(p => {
      text += `• ${p.name}: ${p.dosePerHa} ${p.unit}\n`;
    });
    text += '\n';
  }

  if (treatmentPlan && treatmentPlan.totalCostPerHa > 0) {
    text += `💰 *INVESTIMENTO*\n`;
    text += `• Custo/ha: ${fmtCurrency(treatmentPlan.totalCostPerHa)}\n`;
    if (hectares > 0) text += `• Total: ${fmtCurrency(treatmentPlan.totalCostPerHa * hectares)}\n`;
  }

  text += `\n_Relatório gerado pelo Solo V3 • ${new Date().getFullYear()}_`;
  return text;
}

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
export function PhytoReportStep() {
  const { coffeeData } = useCoffee();
  const { profile } = useUserProfile();
  const { isConsultor } = useUserRole();
  const { talhoes } = useTalhoes();
  const reportRef = useRef<HTMLDivElement>(null);

  const coffeeLabel = coffeeData.coffeeType === 'conilon' ? 'Conilon' : 'Arábica';
  const hectares = coffeeData.hectares || 0;

  const selectedTalhao = talhoes.find(t => t.id === coffeeData.selectedTalhaoId);
  const isIrrigated = selectedTalhao?.irrigated ?? false;

  const hasTreatment = coffeeData.treatmentPlan && coffeeData.treatmentPlan.entries.length > 0;
  const hasFertigation = isIrrigated && coffeeData.fertigation && coffeeData.fertigation.products.length > 0;
  const hasSpraying = coffeeData.coffeeSpraying && coffeeData.coffeeSpraying.products.length > 0;
  const hasData = hasTreatment || hasFertigation || hasSpraying;

  const treatmentCostPerHa = coffeeData.treatmentPlan?.totalCostPerHa || 0;

  // ─── PDF Generation ────────────────────────────────────────
  const generatePdf = useCallback(async () => {
    if (!reportRef.current) return;
    toast.info('Gerando PDF...');
    try {
      const el = reportRef.current;
      const originalDisplay = el.style.display;
      el.style.display = 'block';

      await new Promise(r => setTimeout(r, 500));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 850,
      });

      // Gather break points
      const scale = canvas.width / el.offsetWidth;
      const breakPoints = new Set<number>();
      const gatherBreakPoints = (parent: HTMLElement, depth: number) => {
        if (depth > 5) return;
        const kids = Array.from(parent.children) as HTMLElement[];
        for (const child of kids) {
          const top = child.getBoundingClientRect().top - el.getBoundingClientRect().top;
          const bottom = top + child.getBoundingClientRect().height;
          breakPoints.add(Math.round(top * scale));
          breakPoints.add(Math.round(bottom * scale));
          const tag = child.tagName.toLowerCase();
          if (['div', 'tbody', 'table', 'section', 'tr', 'ul', 'ol', 'li'].includes(tag)) {
            gatherBreakPoints(child, depth + 1);
          }
        }
      };
      gatherBreakPoints(el, 0);

      el.style.display = originalDisplay;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = pdfHeight - margin * 2;
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= contentHeight) {
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgWidth, imgHeight);
      } else {
        const pxPerMm = imgHeight / canvas.height;
        const maxSlicePx = contentHeight / pxPerMm;
        const sortedBreaks = Array.from(breakPoints).sort((a, b) => a - b);
        sortedBreaks.push(canvas.height);

        const slices: { srcY: number; srcH: number }[] = [];
        let currentY = 0;

        while (currentY < canvas.height) {
          const remaining = canvas.height - currentY;
          if (remaining <= maxSlicePx * 1.15) {
            slices.push({ srcY: currentY, srcH: remaining });
            break;
          }
          const idealEnd = currentY + maxSlicePx;
          let bestBreak = idealEnd;
          let bestDist = Infinity;

          for (const bp of sortedBreaks) {
            if (bp <= currentY + 30 * scale) continue;
            if (bp > idealEnd + maxSlicePx * 0.05) break;
            const dist = idealEnd - bp;
            const absDist = Math.abs(dist);
            const penalty = dist < 0 ? absDist * 3 : absDist;
            if (penalty < bestDist) { bestDist = penalty; bestBreak = bp; }
          }
          bestBreak = Math.min(bestBreak, canvas.height);
          slices.push({ srcY: currentY, srcH: bestBreak - currentY });
          currentY = bestBreak;
        }

        const totalPages = slices.length;
        slices.forEach((slice, page) => {
          if (page > 0) pdf.addPage();
          const destH = (slice.srcH / canvas.height) * imgHeight;
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = slice.srcH;
          const ctx = pageCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, slice.srcY, canvas.width, slice.srcH, 0, 0, canvas.width, slice.srcH);
            pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgWidth, destH);
          }
          pdf.setFontSize(8);
          pdf.setTextColor(150);
          pdf.text(`Solo V3 • Página ${page + 1}/${totalPages}`, pdfWidth / 2, pdfHeight - 5, { align: 'center' });
        });
      }

      const date = new Date().toLocaleDateString('pt-BR');
      pdf.save(`Fitossanitario_Cafe_${coffeeLabel}_${date}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Erro ao gerar PDF');
    }
  }, [coffeeLabel]);

  const handlePrint = useCallback(() => { window.print(); }, []);

  const handleShareWhatsApp = useCallback(() => {
    const text = buildWhatsAppText({
      coffeeLabel, hectares,
      treatmentPlan: coffeeData.treatmentPlan,
      fertigation: coffeeData.fertigation,
      spraying: coffeeData.coffeeSpraying,
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }, [coffeeLabel, hectares, coffeeData]);

  const handleNativeShare = useCallback(async () => {
    const text = buildWhatsAppText({
      coffeeLabel, hectares,
      treatmentPlan: coffeeData.treatmentPlan,
      fertigation: coffeeData.fertigation,
      spraying: coffeeData.coffeeSpraying,
    });
    if (navigator.share) {
      try {
        await navigator.share({ title: `Fitossanitário — Café ${coffeeLabel}`, text });
      } catch {}
    }
  }, [coffeeLabel, hectares, coffeeData]);

  const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  // ─── Inline styles for the print-ready report ──────────────
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

  const sectionTitleStyle = (num: number): React.CSSProperties => ({
    fontSize: 12, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase',
    letterSpacing: 1.2, marginTop: 18, marginBottom: 8,
    borderBottom: '1px solid #e5e7eb', paddingBottom: 4,
  });

  const cellStyle: React.CSSProperties = {
    padding: '6px 10px', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top',
  };

  const zebraRow = (i: number): React.CSSProperties => ({
    backgroundColor: i % 2 === 0 ? '#f9fafb' : '#ffffff',
  });

  let sectionNum = 0;

  return (
    <div className="space-y-6" style={{ animation: 'fade-in 0.3s ease-out' }}>
      {/* ─── Header ─── */}
      <div className="text-center mb-2">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-1">
          Relatório Fitossanitário — Café {coffeeLabel}
        </h2>
        <p className="text-sm text-muted-foreground">
          Relatório técnico pronto para impressão e compartilhamento
        </p>
      </div>

      {/* ─── Action Buttons ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        <Button variant="outline" className="gap-2" onClick={generatePdf} disabled={!hasData}>
          <FileDown className="w-4 h-4" />
          PDF
        </Button>
        <Button variant="outline" className="gap-2" onClick={handlePrint} disabled={!hasData}>
          <Printer className="w-4 h-4" />
          Imprimir
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleShareWhatsApp} disabled={!hasData}>
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleNativeShare} disabled={!hasData}>
          <Share2 className="w-4 h-4" />
          Compartilhar
        </Button>
      </div>

      {/* ─── Empty State ─── */}
      {!hasData && (
        <div className="text-center py-12">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground text-sm">
            Preencha as etapas anteriores para gerar o relatório.
          </p>
        </div>
      )}

      {/* ─── Hidden Print-Ready Report ─── */}
      <div
        ref={reportRef}
        style={{ ...s, position: 'fixed', left: -9999, top: 0, zIndex: -1, display: hasData ? 'block' : 'none' }}
      >
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>
              Controle Fitossanitário — Café {coffeeLabel}
            </div>
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
              Gerado em {dateStr} • SOLO V3
            </div>
            {hectares > 0 && (
              <div style={{ fontSize: 10, color: '#374151', marginTop: 2 }}>
                Área: {hectares} hectares
              </div>
            )}
          </div>
          <img src={LOGO_URL} alt="Solo V3" style={{ height: 40, opacity: 0.9 }} crossOrigin="anonymous" />
        </div>

        {/* 1. Defensivos */}
        {hasTreatment && coffeeData.treatmentPlan && (() => {
          sectionNum++;
          const tp = coffeeData.treatmentPlan!;
          return (
            <div style={{ pageBreakInside: 'avoid' }}>
              <div style={sectionTitleStyle(sectionNum)}>{sectionNum}. Doenças & Pragas — Plano de Controle</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ ...cellStyle, fontWeight: 600, textAlign: 'left' }}>Produto</th>
                    <th style={{ ...cellStyle, fontWeight: 600, textAlign: 'left' }}>Alvo</th>
                    <th style={{ ...cellStyle, fontWeight: 600, textAlign: 'left' }}>Princípio Ativo</th>
                    <th style={{ ...cellStyle, fontWeight: 600, textAlign: 'center' }}>Dose/ha</th>
                    <th style={{ ...cellStyle, fontWeight: 600, textAlign: 'right' }}>Custo/ha</th>
                  </tr>
                </thead>
                <tbody>
                  {tp.entries.map((entry, idx) => (
                    <tr key={idx} style={zebraRow(idx)}>
                      <td style={{ ...cellStyle, fontWeight: 600 }}>{entry.produto}</td>
                      <td style={cellStyle}>{entry.alvo}</td>
                      <td style={cellStyle}>{entry.principioAtivo}</td>
                      <td style={{ ...cellStyle, textAlign: 'center' }}>{entry.dosePerHa} {entry.unidade}</td>
                      <td style={{ ...cellStyle, textAlign: 'right' }}>{entry.costPerHa > 0 ? fmtCurrency(entry.costPerHa) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 11 }}>
                <div><strong>Equipamento:</strong> {tp.equipmentLabel}</div>
                {tp.totalCostPerHa > 0 && <div><strong>Total:</strong> {fmtCurrency(tp.totalCostPerHa)}/ha</div>}
              </div>
            </div>
          );
        })()}

        {/* 2. Fertirrigação */}
        {hasFertigation && coffeeData.fertigation && (() => {
          sectionNum++;
          const fd = coffeeData.fertigation!;
          const volTotal = fd.volumePerHa * hectares;
          const tanksNeeded = fd.volumePerHa > 0 ? Math.ceil(volTotal / fd.tankSize) : 0;
          return (
            <div style={{ pageBreakInside: 'avoid' }}>
              <div style={sectionTitleStyle(sectionNum)}>{sectionNum}. Fertirrigação</div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 11 }}>
                <div><strong>Caixa:</strong> {fd.tankSize} L</div>
                <div><strong>Volume/ha:</strong> {fd.volumePerHa} L</div>
                <div><strong>Nº Caixas:</strong> {tanksNeeded}</div>
                <div><strong>Volume Total:</strong> {volTotal.toLocaleString()} L</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ ...cellStyle, fontWeight: 600, textAlign: 'left' }}>Produto</th>
                    <th style={{ ...cellStyle, fontWeight: 600, textAlign: 'left' }}>Tipo</th>
                    <th style={{ ...cellStyle, fontWeight: 600, textAlign: 'center' }}>Dose/ha</th>
                    <th style={{ ...cellStyle, fontWeight: 600, textAlign: 'center' }}>Por Caixa</th>
                    <th style={{ ...cellStyle, fontWeight: 600, textAlign: 'center' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {fd.products.map((p, idx) => {
                    const { value: doseNorm, outputUnit } = normalizeDose(p.dosePerHa, p.unit);
                    const perTank = fd.volumePerHa > 0 ? doseNorm * (fd.tankSize / fd.volumePerHa) : 0;
                    const total = doseNorm * hectares;
                    return (
                      <tr key={p.id} style={zebraRow(idx)}>
                        <td style={{ ...cellStyle, fontWeight: 600 }}>{p.name}</td>
                        <td style={cellStyle}>{p.type}</td>
                        <td style={{ ...cellStyle, textAlign: 'center' }}>{p.dosePerHa} {p.unit}</td>
                        <td style={{ ...cellStyle, textAlign: 'center' }}>{formatQty(perTank, outputUnit)}</td>
                        <td style={{ ...cellStyle, textAlign: 'center' }}>{formatQty(total, outputUnit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* 3. Pulverização */}
        {hasSpraying && coffeeData.coffeeSpraying && (() => {
          sectionNum++;
          const sp = coffeeData.coffeeSpraying!;
          const equipLabel: Record<string, string> = {
            trator: 'Bomba Jato (Trator)',
            drone: 'Drone',
            bomba_costal: 'Bomba Costal',
          };
          const volTotal = sp.applicationRate * hectares;
          const tanksNeeded = sp.tankCapacity > 0 ? Math.ceil(volTotal / sp.tankCapacity) : 0;
          return (
            <div style={{ pageBreakInside: 'avoid' }}>
              <div style={sectionTitleStyle(sectionNum)}>{sectionNum}. Pulverização</div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 11 }}>
                <div><strong>Equipamento:</strong> {equipLabel[sp.equipmentType]}</div>
                <div><strong>Tanque:</strong> {sp.tankCapacity} L</div>
                <div><strong>Taxa:</strong> {sp.applicationRate} L/ha</div>
                <div><strong>Nº Tanques:</strong> {tanksNeeded}</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ ...cellStyle, fontWeight: 600, textAlign: 'left' }}>Produto</th>
                    <th style={{ ...cellStyle, fontWeight: 600, textAlign: 'left' }}>Tipo</th>
                    <th style={{ ...cellStyle, fontWeight: 600, textAlign: 'center' }}>Dose/ha</th>
                    <th style={{ ...cellStyle, fontWeight: 600, textAlign: 'center' }}>Por Tanque</th>
                    <th style={{ ...cellStyle, fontWeight: 600, textAlign: 'center' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sp.products.map((p, idx) => {
                    const { value: doseNorm, outputUnit } = normalizeDose(p.dosePerHa, p.unit);
                    const areaPerTank = sp.applicationRate > 0 ? sp.tankCapacity / sp.applicationRate : 0;
                    const perTank = doseNorm * areaPerTank;
                    const total = doseNorm * hectares;
                    return (
                      <tr key={p.id} style={zebraRow(idx)}>
                        <td style={{ ...cellStyle, fontWeight: 600 }}>{p.name}</td>
                        <td style={cellStyle}>{p.type}</td>
                        <td style={{ ...cellStyle, textAlign: 'center' }}>{p.dosePerHa} {p.unit}</td>
                        <td style={{ ...cellStyle, textAlign: 'center' }}>{formatQty(perTank, outputUnit)}</td>
                        <td style={{ ...cellStyle, textAlign: 'center' }}>{formatQty(total, outputUnit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* Investimento */}
        {treatmentCostPerHa > 0 && (() => {
          sectionNum++;
          return (
            <div style={{ pageBreakInside: 'avoid' }}>
              <div style={sectionTitleStyle(sectionNum)}>{sectionNum}. Investimento Consolidado</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Custo Defensivos / ha', fmtCurrency(treatmentCostPerHa)],
                    ...(hectares > 0 ? [['Investimento Total (' + hectares + ' ha)', fmtCurrency(treatmentCostPerHa * hectares)]] : []),
                  ].map(([label, value], i) => (
                    <tr key={String(label)} style={zebraRow(i)}>
                      <td style={{ ...cellStyle, fontWeight: 600, width: '50%' }}>{label}</td>
                      <td style={{ ...cellStyle, fontWeight: 700, fontSize: 13 }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* Aviso Legal */}
        {(() => {
          sectionNum++;
          return (
            <div style={{ pageBreakInside: 'avoid' }}>
              <div style={sectionTitleStyle(sectionNum)}>{sectionNum}. Aviso Legal</div>
              <div style={{
                padding: '10px 14px', background: '#f3f4f6', border: '1px solid #d1d5db',
                borderRadius: 6, fontSize: 10, color: '#4b5563', lineHeight: 1.6,
              }}>
                Esta é uma ferramenta de suporte à decisão. A compra e aplicação de defensivos agrícolas exige emissão de
                Receituário Agronômico por um Engenheiro Agrônomo responsável (Lei 7.802/1989). Consulte sempre um profissional habilitado.
                As doses e produtos indicados são referências técnicas e podem variar conforme condições locais.
              </div>
            </div>
          );
        })()}

        {/* Footer */}
        <div style={{
          marginTop: 24, paddingTop: 12, borderTop: '1px solid #d1d5db',
          display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6b7280',
        }}>
          <div>
            {isConsultor && profile?.full_name ? (
              <>
                <div style={{ fontWeight: 600 }}>Responsável Técnico: {profile.full_name}</div>
                {profile.crea_art && <div>CREA/ART: {profile.crea_art}</div>}
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

      {/* ─── On-Screen Preview (simplified) ─── */}
      {hasData && (
        <div className="space-y-4">
          {hasTreatment && coffeeData.treatmentPlan && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/30">
                <ShieldAlert className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex-1">Doenças & Pragas</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {coffeeData.treatmentPlan.entries.length} alvo(s)
                </span>
              </div>
              <div className="p-5 space-y-2">
                {coffeeData.treatmentPlan.entries.map((entry, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-secondary/50 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{entry.produto}</p>
                      <p className="text-[10px] text-muted-foreground">{entry.alvo} • {entry.principioAtivo}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">{entry.dosePerHa} {entry.unidade}</p>
                      {entry.costPerHa > 0 && <p className="text-[10px] text-muted-foreground">{fmtCurrency(entry.costPerHa)}/ha</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasFertigation && coffeeData.fertigation && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/30">
                <Waves className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex-1">Fertirrigação</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {coffeeData.fertigation.products.length} produto(s)
                </span>
              </div>
              <div className="p-5 space-y-2">
                {coffeeData.fertigation.products.map(p => (
                  <div key={p.id} className="p-3 rounded-xl bg-secondary/50 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.type}</p>
                    </div>
                    <p className="text-sm font-medium">{p.dosePerHa} {p.unit}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasSpraying && coffeeData.coffeeSpraying && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/30">
                <Droplets className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex-1">Pulverização</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {coffeeData.coffeeSpraying.products.length} produto(s)
                </span>
              </div>
              <div className="p-5 space-y-2">
                {coffeeData.coffeeSpraying.products.map(p => (
                  <div key={p.id} className="p-3 rounded-xl bg-secondary/50 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.type}</p>
                    </div>
                    <p className="text-sm font-medium">{p.dosePerHa} {p.unit}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {treatmentCostPerHa > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/30">
                <DollarSign className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Investimento</h3>
              </div>
              <div className="p-5 grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Custo / ha</p>
                  <p className="text-lg font-bold text-foreground">{fmtCurrency(treatmentCostPerHa)}</p>
                </div>
                {hectares > 0 && (
                  <div className="text-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total ({hectares} ha)</p>
                    <p className="text-lg font-bold text-foreground">{fmtCurrency(treatmentCostPerHa * hectares)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
