import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { FileDown, Share2, Printer, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import type { FinancialTransaction, SafraMeta } from '@/hooks/useFinancialTransactions';
import { LOGO_URL } from '@/lib/constants';

interface Props {
  transactions: FinancialTransaction[];
  safraMetas: SafraMeta[];
  totalReceitas: number;
  totalDespesas: number;
  totalSacos: number;
  categorySummary: { value: string; label: string; total: number; percentage: number }[];
  fornecedorSummary: { name: string; total: number; percentage: number }[];
  revenueTransactions: FinancialTransaction[];
  safra: string;
  onClose: () => void;
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

// Colors
const GREEN = [45, 90, 39] as const;   // #2d5a27
const GRAY_BG = [245, 245, 245] as const;
const TOTAL_BG = [240, 244, 239] as const;
const RED = [198, 40, 40] as const;
const BLACK = [26, 26, 26] as const;
const GRAY_TEXT = [102, 102, 102] as const;
const LIGHT_BORDER = [224, 224, 224] as const;
const ROW_BORDER = [240, 240, 240] as const;

export function FinancialReport({
  transactions, safraMetas, totalReceitas, totalDespesas, totalSacos,
  categorySummary, fornecedorSummary, revenueTransactions, safra, onClose,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const saldoLiquido = totalReceitas - totalDespesas;
  const margemLucro = totalReceitas > 0 ? (saldoLiquido / totalReceitas) * 100 : 0;
  const custoMedioSaca = totalSacos > 0 ? totalDespesas / totalSacos : 0;
  const top5Fornecedores = fornecedorSummary.slice(0, 5);

  // ── PDF Generation with jsPDF ──
  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const marginL = 15;
      const marginR = 15;
      const contentW = pageW - marginL - marginR;
      let y = 15;

      const checkPage = (needed: number) => {
        if (y + needed > 280) {
          doc.addPage();
          y = 15;
        }
      };

      // Load logo
      const logoImg = await loadImage(LOGO_URL);

      // ── HEADER ──
      if (logoImg) {
        doc.addImage(logoImg, 'PNG', marginL, y, 18, 18);
      }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GREEN);
      doc.text(`Demonstrativo de Resultado`, marginL + 22, y + 7);
      doc.setFontSize(10);
      doc.text(`Safra ${safra}`, marginL + 22, y + 13);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY_TEXT);
      doc.text(`Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, marginL + 22, y + 18);
      y += 24;
      doc.setDrawColor(...GREEN);
      doc.setLineWidth(0.5);
      doc.line(marginL, y, pageW - marginR, y);
      y += 8;

      // ── BLOCO 1: ENTRADAS ──
      drawSectionTitle(doc, 'Bloco 1 — Entradas (Receitas)', marginL, y, contentW);
      y += 8;

      if (revenueTransactions.length > 0) {
        const headers = ['Data', 'Comprador', 'Produto', 'Qtd', 'Valor Total'];
        const colWidths = [22, 42, 48, 18, contentW - 130];
        const aligns: ('left' | 'right')[] = ['left', 'left', 'left', 'right', 'right'];

        y = drawTableHeader(doc, headers, colWidths, aligns, marginL, y);

        revenueTransactions.forEach((tx) => {
          checkPage(6);
          const row = [
            format(new Date(tx.data), 'dd/MM/yy'),
            tx.fornecedor || '—',
            truncate(tx.descricao, 30),
            String(tx.quantidade),
            fmtBRL(tx.valor_total),
          ];
          y = drawTableRow(doc, row, colWidths, aligns, marginL, y, false);
        });

        // Total row
        checkPage(8);
        y = drawTotalRow(doc, 'Receita Bruta Total', fmtBRL(totalReceitas), marginL, y, contentW);
      } else {
        doc.setFontSize(9);
        doc.setTextColor(...GRAY_TEXT);
        doc.text('Nenhuma receita registrada na safra.', marginL, y);
        y += 6;
      }

      y += 6;

      // ── BLOCO 2: SAÍDAS ──
      checkPage(20);
      drawSectionTitle(doc, 'Bloco 2 — Saídas Consolidadas (Custos de Produção)', marginL, y, contentW);
      y += 8;

      // 2.1 Por Categoria
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLACK);
      doc.text('2.1 Custos por Categoria', marginL, y);
      y += 5;

      const catHeaders = ['Centro de Custo', 'Valor', '%'];
      const catWidths = [contentW - 60, 38, 22];
      const catAligns: ('left' | 'right')[] = ['left', 'right', 'right'];

      y = drawTableHeader(doc, catHeaders, catWidths, catAligns, marginL, y);

      categorySummary.forEach(cat => {
        checkPage(6);
        y = drawTableRow(doc, [cat.label, fmtBRL(cat.total), `${cat.percentage.toFixed(1)}%`], catWidths, catAligns, marginL, y, false);
      });

      checkPage(8);
      y = drawTotalRow(doc, 'Custo Operacional Total', fmtBRL(totalDespesas), marginL, y, contentW, '100%');

      y += 6;

      // 2.2 Top Fornecedores
      if (top5Fornecedores.length > 0) {
        checkPage(20);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLACK);
        doc.text('2.2 Concentração de Fornecedores (Top 5)', marginL, y);
        y += 5;

        const fornHeaders = ['#', 'Fornecedor', 'Valor Total', '%'];
        const fornWidths = [10, contentW - 72, 40, 22];
        const fornAligns: ('left' | 'right')[] = ['left', 'left', 'right', 'right'];

        y = drawTableHeader(doc, fornHeaders, fornWidths, fornAligns, marginL, y);

        top5Fornecedores.forEach((f, i) => {
          checkPage(6);
          y = drawTableRow(doc, [`${i + 1}º`, truncate(f.name, 28), fmtBRL(f.total), `${f.percentage.toFixed(1)}%`], fornWidths, fornAligns, marginL, y, false);
        });

        y += 6;
      }

      // ── BLOCO 3: INDICADORES ──
      checkPage(35);
      drawSectionTitle(doc, 'Bloco 3 — Indicadores Finais', marginL, y, contentW);
      y += 8;

      const kpiW = (contentW - 8) / 3;
      const kpis = [
        { label: 'SALDO LÍQUIDO', value: fmtBRL(saldoLiquido), color: saldoLiquido >= 0 ? GREEN : RED },
        { label: 'MARGEM DE LUCRO', value: `${margemLucro.toFixed(1)}%`, color: margemLucro >= 0 ? GREEN : RED },
        { label: 'CUSTO MÉDIO/SACA', value: custoMedioSaca > 0 ? fmtBRL(custoMedioSaca) : '—', color: BLACK },
      ];

      kpis.forEach((kpi, i) => {
        const x = marginL + i * (kpiW + 4);
        doc.setDrawColor(...LIGHT_BORDER);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, kpiW, 22, 2, 2, 'S');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY_TEXT);
        doc.text(kpi.label, x + kpiW / 2, y + 7, { align: 'center' });

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...(kpi.color as [number, number, number]));
        doc.text(kpi.value, x + kpiW / 2, y + 17, { align: 'center' });
      });

      y += 30;

      // ── FOOTER ──
      checkPage(10);
      doc.setDrawColor(...LIGHT_BORDER);
      doc.setLineWidth(0.2);
      doc.line(marginL, y, pageW - marginR, y);
      y += 4;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(153, 153, 153);
      doc.text(
        `Relatório gerado automaticamente pelo Solo Agro · ${format(new Date(), 'dd/MM/yyyy HH:mm')} · Uso exclusivo para gestão interna`,
        pageW / 2, y, { align: 'center' }
      );

      doc.save(`DRE_Safra_${safra.replace('/', '-')}.pdf`);
      toast({ title: '✅ PDF gerado com sucesso!' });
    } catch (err: any) {
      console.error('PDF generation error:', err);
      toast({ title: 'Erro ao gerar PDF', description: err.message, variant: 'destructive' });
    }
    setGenerating(false);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Relatório Financeiro - ${safra}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; padding: 20px; font-size: 11px; }
        h2 { font-size: 13px; font-weight: 700; margin: 16px 0 8px; color: #2d5a27; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th { background: #f5f5f5; text-align: left; padding: 6px 8px; font-size: 10px; font-weight: 600; border-bottom: 1px solid #ddd; }
        td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; font-size: 10px; }
        @media print { body { padding: 0; } @page { size: A4; margin: 15mm; } }
      </style>
      </head><body>${content.innerHTML}</body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handleShare = async () => {
    const text = `📊 Relatório Financeiro - Safra ${safra}\n\n` +
      `☕ Receita Bruta: ${fmtBRL(totalReceitas)}\n` +
      `💸 Custo Operacional: ${fmtBRL(totalDespesas)}\n` +
      `📈 Saldo Líquido: ${fmtBRL(saldoLiquido)}\n` +
      `📉 Margem: ${margemLucro.toFixed(1)}%\n` +
      (custoMedioSaca > 0 ? `💰 Custo/Saca: ${fmtBRL(custoMedioSaca)}\n` : '') +
      `\n📋 Top Categorias:\n` +
      categorySummary.slice(0, 5).map(c => `  • ${c.label}: ${fmtBRL(c.total)} (${c.percentage.toFixed(0)}%)`).join('\n') +
      `\n\n🏪 Top 5 Fornecedores:\n` +
      top5Fornecedores.map(f => `  • ${f.name}: ${fmtBRL(f.total)}`).join('\n');

    if (navigator.share) {
      try { await navigator.share({ title: `Relatório Financeiro - ${safra}`, text }); } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Action bar */}
      <div className="sticky top-0 z-10 bg-background border-b border-border p-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onClose}>← Voltar</Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-1" /> Enviar
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" /> Imprimir
          </Button>
          <Button size="sm" onClick={generatePDF} disabled={generating} className="gap-1.5">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            PDF
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="max-w-3xl mx-auto p-4">
        <div ref={printRef}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '2px solid #2d5a27', paddingBottom: '12px' }}>
            <img src={LOGO_URL} alt="Solo" style={{ height: '36px' }} />
            <div>
              <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#2d5a27' }}>Demonstrativo de Resultado - Safra {safra}</h1>
              <p style={{ fontSize: '10px', color: '#666' }}>Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
            </div>
          </div>

          {/* Bloco 1 */}
          <h2 style={{ fontSize: '13px', fontWeight: 700, margin: '16px 0 8px', color: '#2d5a27', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
            Bloco 1 — Entradas (Receitas)
          </h2>
          {revenueTransactions.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
              <thead>
                <tr>
                  {['Data', 'Comprador', 'Produto', 'Qtd', 'Valor Total'].map((h, i) => (
                    <th key={i} style={{ background: '#f5f5f5', textAlign: i >= 3 ? 'right' : 'left', padding: '6px 8px', fontSize: '10px', fontWeight: 600, borderBottom: '1px solid #ddd' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {revenueTransactions.map((tx, i) => (
                  <tr key={i}>
                    <td style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0', fontSize: '10px' }}>{format(new Date(tx.data), 'dd/MM/yy')}</td>
                    <td style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0', fontSize: '10px' }}>{tx.fornecedor || '—'}</td>
                    <td style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0', fontSize: '10px' }}>{tx.descricao}</td>
                    <td style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0', fontSize: '10px', textAlign: 'right' }}>{tx.quantidade}</td>
                    <td style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0', fontSize: '10px', textAlign: 'right' }}>{fmtBRL(tx.valor_total)}</td>
                  </tr>
                ))}
                <tr style={{ background: '#f0f4ef', fontWeight: 700 }}>
                  <td colSpan={4} style={{ padding: '8px', borderTop: '2px solid #2d5a27' }}>Receita Bruta Total</td>
                  <td style={{ padding: '8px', borderTop: '2px solid #2d5a27', textAlign: 'right' }}>{fmtBRL(totalReceitas)}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: '10px', color: '#999', padding: '8px 0' }}>Nenhuma receita registrada na safra.</p>
          )}

          {/* Bloco 2 */}
          <h2 style={{ fontSize: '13px', fontWeight: 700, margin: '16px 0 8px', color: '#2d5a27', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
            Bloco 2 — Saídas Consolidadas (Custos de Produção)
          </h2>
          <p style={{ fontSize: '11px', fontWeight: 600, margin: '8px 0 4px', color: '#333' }}>2.1 Custos por Categoria</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
            <thead>
              <tr>
                <th style={{ background: '#f5f5f5', textAlign: 'left', padding: '6px 8px', fontSize: '10px', fontWeight: 600, borderBottom: '1px solid #ddd' }}>Centro de Custo</th>
                <th style={{ background: '#f5f5f5', textAlign: 'right', padding: '6px 8px', fontSize: '10px', fontWeight: 600, borderBottom: '1px solid #ddd' }}>Valor</th>
                <th style={{ background: '#f5f5f5', textAlign: 'right', padding: '6px 8px', fontSize: '10px', fontWeight: 600, borderBottom: '1px solid #ddd' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {categorySummary.map((cat, i) => (
                <tr key={i}>
                  <td style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0', fontSize: '10px' }}>{cat.label}</td>
                  <td style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0', fontSize: '10px', textAlign: 'right' }}>{fmtBRL(cat.total)}</td>
                  <td style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0', fontSize: '10px', textAlign: 'right' }}>{cat.percentage.toFixed(1)}%</td>
                </tr>
              ))}
              <tr style={{ background: '#f0f4ef', fontWeight: 700 }}>
                <td style={{ padding: '8px', borderTop: '2px solid #2d5a27' }}>Custo Operacional Total</td>
                <td style={{ padding: '8px', borderTop: '2px solid #2d5a27', textAlign: 'right' }}>{fmtBRL(totalDespesas)}</td>
                <td style={{ padding: '8px', borderTop: '2px solid #2d5a27', textAlign: 'right' }}>100%</td>
              </tr>
            </tbody>
          </table>

          {top5Fornecedores.length > 0 && (
            <>
              <p style={{ fontSize: '11px', fontWeight: 600, margin: '8px 0 4px', color: '#333' }}>2.2 Concentração de Fornecedores (Top 5)</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ background: '#f5f5f5', textAlign: 'left', padding: '6px 8px', fontSize: '10px', fontWeight: 600, borderBottom: '1px solid #ddd' }}>#</th>
                    <th style={{ background: '#f5f5f5', textAlign: 'left', padding: '6px 8px', fontSize: '10px', fontWeight: 600, borderBottom: '1px solid #ddd' }}>Fornecedor</th>
                    <th style={{ background: '#f5f5f5', textAlign: 'right', padding: '6px 8px', fontSize: '10px', fontWeight: 600, borderBottom: '1px solid #ddd' }}>Valor Total</th>
                    <th style={{ background: '#f5f5f5', textAlign: 'right', padding: '6px 8px', fontSize: '10px', fontWeight: 600, borderBottom: '1px solid #ddd' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {top5Fornecedores.map((f, i) => (
                    <tr key={i}>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0', fontSize: '10px' }}>{i + 1}º</td>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0', fontSize: '10px' }}>{f.name}</td>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0', fontSize: '10px', textAlign: 'right' }}>{fmtBRL(f.total)}</td>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0', fontSize: '10px', textAlign: 'right' }}>{f.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Bloco 3 */}
          <h2 style={{ fontSize: '13px', fontWeight: 700, margin: '16px 0 8px', color: '#2d5a27', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
            Bloco 3 — Indicadores Finais
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
            {[
              { label: 'Saldo Líquido', value: fmtBRL(saldoLiquido), color: saldoLiquido >= 0 ? '#2d5a27' : '#c62828' },
              { label: 'Margem de Lucro', value: `${margemLucro.toFixed(1)}%`, color: margemLucro >= 0 ? '#2d5a27' : '#c62828' },
              { label: 'Custo Médio/Saca', value: custoMedioSaca > 0 ? fmtBRL(custoMedioSaca) : '—', color: '#1a1a1a' },
            ].map((kpi, i) => (
              <div key={i} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px', color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '9px', color: '#999', borderTop: '1px solid #e0e0e0', paddingTop: '8px' }}>
            Relatório gerado automaticamente pelo Solo Agro · {format(new Date(), "dd/MM/yyyy HH:mm")} · Uso exclusivo para gestão interna
          </div>
        </div>
      </div>
    </div>
  );
}

// ── jsPDF Helper Functions ──

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function drawSectionTitle(doc: jsPDF, text: string, x: number, y: number, w: number) {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GREEN);
  doc.text(text, x, y);
  doc.setDrawColor(...LIGHT_BORDER);
  doc.setLineWidth(0.2);
  doc.line(x, y + 2, x + w, y + 2);
}

function drawTableHeader(doc: jsPDF, headers: string[], widths: number[], aligns: ('left' | 'right')[], x: number, y: number): number {
  doc.setFillColor(...GRAY_BG);
  doc.rect(x, y, widths.reduce((a, b) => a + b, 0), 6, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);

  let cx = x;
  headers.forEach((h, i) => {
    const tx = aligns[i] === 'right' ? cx + widths[i] - 2 : cx + 2;
    doc.text(h, tx, y + 4, { align: aligns[i] === 'right' ? 'right' : 'left' });
    cx += widths[i];
  });

  doc.setDrawColor(...LIGHT_BORDER);
  doc.setLineWidth(0.2);
  doc.line(x, y + 6, x + widths.reduce((a, b) => a + b, 0), y + 6);

  return y + 7;
}

function drawTableRow(doc: jsPDF, cells: string[], widths: number[], aligns: ('left' | 'right')[], x: number, y: number, _alt: boolean): number {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BLACK);

  let cx = x;
  cells.forEach((cell, i) => {
    const tx = aligns[i] === 'right' ? cx + widths[i] - 2 : cx + 2;
    doc.text(cell, tx, y + 3.5, { align: aligns[i] === 'right' ? 'right' : 'left' });
    cx += widths[i];
  });

  doc.setDrawColor(...ROW_BORDER);
  doc.setLineWidth(0.1);
  const totalW = widths.reduce((a, b) => a + b, 0);
  doc.line(x, y + 5, x + totalW, y + 5);

  return y + 5.5;
}

function drawTotalRow(doc: jsPDF, label: string, value: string, x: number, y: number, w: number, extra?: string): number {
  doc.setFillColor(...TOTAL_BG);
  doc.rect(x, y, w, 7, 'F');
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.line(x, y, x + w, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text(label, x + 2, y + 5);

  if (extra) {
    doc.text(extra, x + w - 2, y + 5, { align: 'right' });
    doc.text(value, x + w - 24, y + 5, { align: 'right' });
  } else {
    doc.text(value, x + w - 2, y + 5, { align: 'right' });
  }

  return y + 9;
}
