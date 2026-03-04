/**
 * Standalone A4 PDF Generator — Protocolo Fitossanitário de Café
 * Uses jsPDF for vectorial rendering (no html2canvas dependency).
 */
import { useCallback, useState } from 'react';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getProtocoloPorPeriodo,
  CATEGORIA_DEFENSIVO_CONFIG,
  APLICACOES_SOLO,
  OBSERVACOES_MANEJO,
  type CoffeeSpecies,
  type DefensivoFormacao,
} from '@/data/coffeePlantingReference';
import { LOGO_URL } from '@/lib/constants';

// ─── Constants ──────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LINE_H = 4.2;
const SMALL_LINE = 3.5;
const HEADER_H = 22;
const FOOTER_H = 12;
const SAFE_BOTTOM = PAGE_H - MARGIN - FOOTER_H;

// ─── Color Palette (RGB) ────────────────────────────────
const C = {
  primary: [22, 101, 52] as [number, number, number],     // emerald-800
  headerBg: [240, 253, 244] as [number, number, number],   // emerald-50
  sectionBg: [249, 250, 251] as [number, number, number],  // gray-50
  border: [209, 213, 219] as [number, number, number],     // gray-300
  text: [31, 41, 55] as [number, number, number],          // gray-800
  muted: [107, 114, 128] as [number, number, number],      // gray-500
  white: [255, 255, 255] as [number, number, number],
  blue: [37, 99, 235] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
  amber: [217, 119, 6] as [number, number, number],
  teal: [13, 148, 136] as [number, number, number],
  orange: [234, 88, 12] as [number, number, number],
  violet: [124, 58, 237] as [number, number, number],
};

const CAT_COLORS: Record<string, [number, number, number]> = {
  fungicida: C.blue,
  inseticida: C.red,
  bioestimulante: C.teal,
  herbicida: C.amber,
  acaricida: C.orange,
};

interface Props {
  coffeeType: CoffeeSpecies;
  talhaoName?: string;
  consultorName?: string;
  creaArt?: string;
}

export function CoffeePhytoProtocolPdfButton({ coffeeType, talhaoName, consultorName, creaArt }: Props) {
  const [generating, setGenerating] = useState(false);

  const generate = useCallback(async () => {
    setGenerating(true);
    toast.info('Gerando Protocolo Fitossanitário A4...');

    try {
      await new Promise(r => setTimeout(r, 100)); // let UI update

      const pdf = new jsPDF('p', 'mm', 'a4');
      const speciesLabel = coffeeType === 'arabica' ? 'Arábica' : 'Conilon';
      const speciesScientific = coffeeType === 'arabica' ? 'Coffea arabica' : 'Coffea canephora';
      const periodos = getProtocoloPorPeriodo(coffeeType);
      const dateStr = new Date().toLocaleDateString('pt-BR');
      let pageNum = 1;
      let y = MARGIN;

      // ─── Helpers ──────────────────────────────
      const setFont = (style: 'normal' | 'bold' | 'italic' = 'normal', size = 9) => {
        pdf.setFont('helvetica', style);
        pdf.setFontSize(size);
      };

      const checkPage = (needed: number) => {
        if (y + needed > SAFE_BOTTOM) {
          drawFooter();
          pdf.addPage();
          pageNum++;
          y = MARGIN;
          drawHeader();
        }
      };

      const drawFooter = () => {
        pdf.setDrawColor(...C.border);
        pdf.line(MARGIN, PAGE_H - MARGIN - FOOTER_H + 2, PAGE_W - MARGIN, PAGE_H - MARGIN - FOOTER_H + 2);
        setFont('italic', 7);
        pdf.setTextColor(...C.muted);
        pdf.text(`Solo V3 Tecnologia Agrícola • Protocolo Fitossanitário — ${speciesLabel} • ${dateStr}`, MARGIN, PAGE_H - MARGIN - 3);
        pdf.text(`Página ${pageNum}`, PAGE_W - MARGIN, PAGE_H - MARGIN - 3, { align: 'right' });
      };

      const drawHeader = () => {
        // Green header bar
        pdf.setFillColor(...C.primary);
        pdf.rect(MARGIN, y, CONTENT_W, 8, 'F');
        setFont('bold', 10);
        pdf.setTextColor(...C.white);
        pdf.text(`PROTOCOLO FITOSSANITÁRIO — CAFÉ ${speciesLabel.toUpperCase()}`, MARGIN + 3, y + 5.5);
        y += 10;
      };

      // ─── Cover / Title ────────────────────────
      // Load logo
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = LOGO_URL;
        });
        if (img.complete && img.naturalWidth > 0) {
          const logoH = 18;
          const logoW = (img.naturalWidth / img.naturalHeight) * logoH;
          pdf.addImage(img, 'PNG', (PAGE_W - logoW) / 2, y, logoW, logoH);
          y += logoH + 4;
        }
      } catch {
        y += 4;
      }

      // Title block
      pdf.setFillColor(...C.primary);
      pdf.rect(MARGIN, y, CONTENT_W, 14, 'F');
      setFont('bold', 14);
      pdf.setTextColor(...C.white);
      pdf.text('PROTOCOLO FITOSSANITÁRIO', PAGE_W / 2, y + 6, { align: 'center' });
      setFont('normal', 10);
      pdf.text(`Café ${speciesLabel} (${speciesScientific})`, PAGE_W / 2, y + 11.5, { align: 'center' });
      y += 18;

      // Meta info
      setFont('normal', 9);
      pdf.setTextColor(...C.text);
      const metaLines = [
        `📅 Data: ${dateStr}`,
        `☕ Espécie: ${speciesLabel} — ${speciesScientific}`,
      ];
      if (talhaoName) metaLines.push(`📍 Talhão: ${talhaoName}`);
      metaLines.push('📚 Ref: EMBRAPA Café / INCAPER / 5ª Aproximação MG');
      metaLines.forEach(line => {
        pdf.text(line, MARGIN, y + 3);
        y += LINE_H + 1;
      });
      y += 2;

      // Category legend
      pdf.setFillColor(...C.sectionBg);
      pdf.roundedRect(MARGIN, y, CONTENT_W, 10, 2, 2, 'F');
      setFont('bold', 7.5);
      pdf.setTextColor(...C.muted);
      pdf.text('LEGENDA:', MARGIN + 3, y + 4);
      let legendX = MARGIN + 24;
      Object.entries(CATEGORIA_DEFENSIVO_CONFIG).forEach(([key, cfg]) => {
        const color = CAT_COLORS[key] || C.muted;
        pdf.setTextColor(...color);
        setFont('bold', 7.5);
        const label = `${cfg.icon} ${cfg.label}`;
        pdf.text(label, legendX, y + 4);
        legendX += pdf.getTextWidth(label) + 6;
      });
      y += 14;

      // Species-specific badge
      const badgeColor = coffeeType === 'arabica' ? C.violet : C.teal;
      pdf.setFillColor(...badgeColor);
      pdf.roundedRect(MARGIN, y, CONTENT_W, 7, 2, 2, 'F');
      setFont('bold', 8);
      pdf.setTextColor(...C.white);
      pdf.text(
        coffeeType === 'arabica'
          ? '🏔️ Protocolo específico para Coffea arabica — inclui Phoma, Mancha Aureolada e Voliam Targo'
          : '☀️ Protocolo específico para Coffea canephora (Conilon) — inclui Crespeira, Ácaro-branco e Envidor',
        PAGE_W / 2, y + 4.8, { align: 'center' }
      );
      y += 11;

      // ─── Períodos Fenológicos ──────────────────
      periodos.forEach((periodo, pIdx) => {
        if (periodo.defensivos.length === 0) return;

        // Deduplicate
        const uniqueDefs = Array.from(new Map(periodo.defensivos.map(d => [d.nome, d])).values());

        // Estimate height needed
        const estHeight = 12 + uniqueDefs.length * 18;
        checkPage(Math.min(estHeight, 60));

        // Period header
        pdf.setFillColor(...C.primary);
        pdf.rect(MARGIN, y, CONTENT_W, 8, 'F');
        setFont('bold', 9);
        pdf.setTextColor(...C.white);
        pdf.text(periodo.periodo, MARGIN + 3, y + 5.5);
        y += 9;

        // Focus description
        pdf.setFillColor(...C.headerBg);
        pdf.rect(MARGIN, y, CONTENT_W, 6, 'F');
        setFont('italic', 7.5);
        pdf.setTextColor(...C.muted);
        const focusLines = pdf.splitTextToSize(periodo.foco, CONTENT_W - 6);
        focusLines.forEach((line: string, i: number) => {
          pdf.text(line, MARGIN + 3, y + 3.5 + i * SMALL_LINE);
        });
        y += Math.max(6, focusLines.length * SMALL_LINE + 2);

        // Defensivos table
        uniqueDefs.forEach((def, dIdx) => {
          checkPage(20);

          const catColor = CAT_COLORS[def.categoria] || C.muted;
          const isExclusive = def.culturas && def.culturas.length === 1;

          // Row background
          const rowBg = dIdx % 2 === 0 ? C.white : C.sectionBg;
          pdf.setFillColor(...rowBg);
          
          // Calculate row height
          const instrLines = pdf.splitTextToSize(def.instrucao, CONTENT_W - 8);
          const rowH = 14 + instrLines.length * SMALL_LINE;
          
          pdf.rect(MARGIN, y, CONTENT_W, rowH, 'F');
          pdf.setDrawColor(...C.border);
          pdf.rect(MARGIN, y, CONTENT_W, rowH, 'S');

          // Category badge
          setFont('bold', 7);
          pdf.setTextColor(...catColor);
          const catLabel = `${CATEGORIA_DEFENSIVO_CONFIG[def.categoria]?.icon || ''} ${CATEGORIA_DEFENSIVO_CONFIG[def.categoria]?.label || def.categoria}`;
          pdf.text(catLabel, MARGIN + 3, y + 4);

          // Species exclusive badge
          if (isExclusive) {
            const exLabel = def.culturas![0] === 'arabica' ? '🏔️ Arábica' : '☀️ Conilon';
            setFont('bold', 6.5);
            pdf.setTextColor(...(def.culturas![0] === 'arabica' ? C.violet : C.teal));
            pdf.text(exLabel, MARGIN + pdf.getTextWidth(catLabel) + 8, y + 4);
          }

          // Product name + dose
          setFont('bold', 9);
          pdf.setTextColor(...C.text);
          pdf.text(def.nome, MARGIN + 3, y + 8.5);
          setFont('bold', 8);
          pdf.setTextColor(...C.primary);
          pdf.text(def.dose, PAGE_W - MARGIN - 3, y + 8.5, { align: 'right' });

          // P.A. + Alvo
          setFont('normal', 7);
          pdf.setTextColor(...C.muted);
          pdf.text(`P.A.: ${def.principioAtivo}`, MARGIN + 3, y + 12);

          setFont('normal', 7);
          pdf.setTextColor(...C.text);
          const alvoText = `Alvo: ${def.alvo}`;
          const alvoW = pdf.getTextWidth(alvoText);
          if (alvoW > CONTENT_W * 0.5) {
            pdf.text(alvoText.substring(0, 70) + '...', MARGIN + 3, y + 12 + SMALL_LINE * 0.6);
          } else {
            pdf.text(alvoText, MARGIN + CONTENT_W * 0.5, y + 12, { align: 'left' });
          }

          // Instruction
          setFont('italic', 7);
          pdf.setTextColor(...C.muted);
          instrLines.forEach((line: string, i: number) => {
            pdf.text(line, MARGIN + 3, y + 14 + SMALL_LINE * 0.3 + i * SMALL_LINE);
          });

          // Meta line (dose/ha, carência, grupo químico)
          const metaParts: string[] = [];
          metaParts.push(`📅 Dose/ha: ${def.doseHa}`);
          if (def.carencia) metaParts.push(`⏱️ Carência: ${def.carencia}d`);
          if (def.grupoQuimico) metaParts.push(`🧪 ${def.grupoQuimico}`);
          setFont('normal', 6.5);
          pdf.setTextColor(...C.muted);
          pdf.text(metaParts.join('    '), MARGIN + 3, y + rowH - 2);

          y += rowH + 0.5;
        });

        y += 4;
      });

      // ─── Aplicação via Solo (Drench) ──────────
      checkPage(40);
      pdf.setFillColor(...C.amber);
      pdf.rect(MARGIN, y, CONTENT_W, 8, 'F');
      setFont('bold', 9);
      pdf.setTextColor(...C.white);
      pdf.text('APLICAÇÃO VIA SOLO (DRENCH)', MARGIN + 3, y + 5.5);
      y += 10;

      APLICACOES_SOLO.forEach((app, idx) => {
        checkPage(18);
        const rowColor = idx % 2 === 0 ? C.white : C.sectionBg;
        pdf.setFillColor(...rowColor);
        const prodText = app.produtos.map(p => `${p.nome}: ${p.dose}`).join(' | ');
        const instrLines = pdf.splitTextToSize(app.instrucao, CONTENT_W - 8);
        const rowH = 12 + instrLines.length * SMALL_LINE;

        pdf.rect(MARGIN, y, CONTENT_W, rowH, 'FD');
        pdf.setDrawColor(...C.border);

        setFont('bold', 8);
        pdf.setTextColor(...C.text);
        pdf.text(app.momento, MARGIN + 3, y + 4.5);
        setFont('normal', 7);
        pdf.setTextColor(...C.muted);
        pdf.text(app.descricao, PAGE_W - MARGIN - 3, y + 4.5, { align: 'right' });

        setFont('normal', 7.5);
        pdf.setTextColor(...C.text);
        pdf.text(prodText, MARGIN + 3, y + 9);

        setFont('italic', 7);
        pdf.setTextColor(...C.muted);
        instrLines.forEach((line: string, i: number) => {
          pdf.text(line, MARGIN + 3, y + 12 + i * SMALL_LINE);
        });

        y += rowH + 1;
      });

      // ─── Observações de Manejo ────────────────
      y += 3;
      checkPage(20);
      pdf.setFillColor(255, 251, 235); // amber-50
      pdf.setDrawColor(...C.amber);
      const obsText = OBSERVACOES_MANEJO.join('\n\n');
      const obsLines = pdf.splitTextToSize(obsText, CONTENT_W - 8);
      const obsH = 6 + obsLines.length * SMALL_LINE;
      pdf.roundedRect(MARGIN, y, CONTENT_W, obsH, 2, 2, 'FD');

      setFont('bold', 7.5);
      pdf.setTextColor(...C.amber);
      pdf.text('⚠️ OBSERVAÇÕES DE MANEJO', MARGIN + 3, y + 4);
      setFont('normal', 7);
      pdf.setTextColor(...C.text);
      obsLines.forEach((line: string, i: number) => {
        pdf.text(line, MARGIN + 3, y + 8 + i * SMALL_LINE);
      });
      y += obsH + 4;

      // ─── Resistance Management Box ────────────
      checkPage(25);
      pdf.setFillColor(239, 246, 255); // blue-50
      pdf.setDrawColor(...C.blue);
      const resistLines = [
        'MANEJO DE RESISTÊNCIA: Alternar grupos químicos (Cúprico → Triazol → Estrobilurina). Nunca repetir o mesmo grupo em aplicações consecutivas.',
        `NDE Bicho-mineiro: Aplicar inseticida apenas quando ≥ 30% das folhas apresentarem minas ativas.`,
        'Biocontrole: Trichoderma e Bacillus NÃO devem ser misturados com fungicidas cúpricos. Aguardar 15 dias entre aplicações.',
        coffeeType === 'arabica'
          ? 'ARÁBICA: Em regiões de altitude (>800m), priorizar Phoma e Mancha Aureolada no período seco/frio. Casugamicina é preventiva obrigatória em áreas com histórico.'
          : 'CONILON: Ácaro-branco é praga-chave — monitorar ramos novos no período seco. Alternar Abamectina e Espirodiclofeno para evitar resistência.',
      ];
      const allResistText = resistLines.join('\n');
      const resistSplit = pdf.splitTextToSize(allResistText, CONTENT_W - 8);
      const resistH = 6 + resistSplit.length * SMALL_LINE;
      pdf.roundedRect(MARGIN, y, CONTENT_W, resistH, 2, 2, 'FD');

      setFont('bold', 7.5);
      pdf.setTextColor(...C.blue);
      pdf.text('🛡️ MANEJO DE RESISTÊNCIA & ALERTAS', MARGIN + 3, y + 4);
      setFont('normal', 7);
      pdf.setTextColor(...C.text);
      resistSplit.forEach((line: string, i: number) => {
        pdf.text(line, MARGIN + 3, y + 8 + i * SMALL_LINE);
      });
      y += resistH + 6;

      // ─── Signature Block ──────────────────────
      checkPage(30);
      pdf.setDrawColor(...C.border);
      pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 8;

      // Two columns for signatures
      const colW = CONTENT_W / 2 - 4;
      const sigLineW = 55;

      // Left: Responsável Técnico
      pdf.line(MARGIN + (colW - sigLineW) / 2, y + 10, MARGIN + (colW + sigLineW) / 2, y + 10);
      setFont('bold', 8);
      pdf.setTextColor(...C.text);
      pdf.text('Responsável Técnico', MARGIN + colW / 2, y + 14, { align: 'center' });
      if (consultorName) {
        setFont('normal', 7);
        pdf.setTextColor(...C.muted);
        pdf.text(`Eng. Agr. ${consultorName}`, MARGIN + colW / 2, y + 18, { align: 'center' });
        if (creaArt) {
          pdf.text(creaArt, MARGIN + colW / 2, y + 21.5, { align: 'center' });
        }
      }

      // Right: Produtor
      const rightX = MARGIN + colW + 8;
      pdf.line(rightX + (colW - sigLineW) / 2, y + 10, rightX + (colW + sigLineW) / 2, y + 10);
      setFont('bold', 8);
      pdf.setTextColor(...C.text);
      pdf.text('Produtor', rightX + colW / 2, y + 14, { align: 'center' });

      y += 26;

      // Footer on all pages
      drawFooter();
      // Add footer to all previous pages
      const totalPages = pageNum;
      for (let p = 1; p < totalPages; p++) {
        pdf.setPage(p);
        // Redraw footer with correct page number
        pdf.setDrawColor(...C.border);
        pdf.line(MARGIN, PAGE_H - MARGIN - FOOTER_H + 2, PAGE_W - MARGIN, PAGE_H - MARGIN - FOOTER_H + 2);
        setFont('italic', 7);
        pdf.setTextColor(...C.muted);
        pdf.text(`Solo V3 Tecnologia Agrícola • Protocolo Fitossanitário — ${speciesLabel} • ${dateStr}`, MARGIN, PAGE_H - MARGIN - 3);
        pdf.text(`Página ${p}/${totalPages}`, PAGE_W - MARGIN, PAGE_H - MARGIN - 3, { align: 'right' });
      }
      // Fix last page footer
      pdf.setPage(totalPages);
      pdf.setDrawColor(...C.border);
      pdf.line(MARGIN, PAGE_H - MARGIN - FOOTER_H + 2, PAGE_W - MARGIN, PAGE_H - MARGIN - FOOTER_H + 2);
      setFont('italic', 7);
      pdf.setTextColor(...C.muted);
      pdf.text(`Solo V3 Tecnologia Agrícola • Protocolo Fitossanitário — ${speciesLabel} • ${dateStr}`, MARGIN, PAGE_H - MARGIN - 3);
      pdf.text(`Página ${totalPages}/${totalPages}`, PAGE_W - MARGIN, PAGE_H - MARGIN - 3, { align: 'right' });

      pdf.save(`Protocolo_Fitossanitario_${speciesLabel}_${dateStr.replace(/\//g, '-')}.pdf`);
      toast.success('Protocolo Fitossanitário exportado!');
    } catch (err) {
      console.error('Phyto PDF error:', err);
      toast.error('Erro ao gerar PDF do protocolo.');
    } finally {
      setGenerating(false);
    }
  }, [coffeeType, talhaoName, consultorName, creaArt]);

  return (
    <Button
      size="lg"
      onClick={generate}
      disabled={generating}
      variant="outline"
      className="gap-2 w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
    >
      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      {generating ? 'Gerando...' : 'Protocolo Fitossanitário (PDF A4)'}
    </Button>
  );
}
