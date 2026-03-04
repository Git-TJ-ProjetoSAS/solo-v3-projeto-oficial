import { useRef, useState } from 'react';
import { Download, MessageCircle, Mail, Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { LOGO_URL } from '@/lib/constants';
import {
  IRRIGATION_SYSTEMS,
  SOIL_TEXTURE_MAP,
  KC_CAFE,
  getKcCoffee,
  type IrrigationSystem,
} from '@/lib/irrigationEngine';

interface ScheduleDay {
  dayLabel: string;
  date: Date;
  etoDay: number;
  etcAccumulated: number;
  etcNetDay: number;
  laminaAplicar: number;
  tempoIrrigacaoH: number;
  aduboKgHa: number;
  rainfallMm: number;
  status: string;
  tMax?: number;
  tMin?: number;
}

interface IrrigationReportProps {
  open: boolean;
  onClose: () => void;
  schedule: ScheduleDay[];
  system: IrrigationSystem;
  turnoRega: number;
  doseAdubo: number;
  avgETo: number;
  avgETc: number;
  laminaLiquida: number;
  laminaBruta: number;
  efficiency: number;
  soilTexture: string;
  soilCad: number;
  talhaoName?: string;
  areaHa?: number;
  totalPlants?: number;
  cityName?: string;
  dailyRainfall: number[];
  /** Dynamic Kc info */
  kcInfo?: { kc: number; phase: string };
  costResult?: {
    custoRega: number;
    custoMensal: number;
    regasMes: number;
    eficienciaRsMmHa: number;
    tarifaEfetiva: number;
  };
}

const printStyles = `
@media print {
  @page { size: A4 portrait; margin: 12mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { margin: 0 !important; padding: 0 !important; background: white !important; color: black !important; font-size: 9pt !important; }
  .print-hide { display: none !important; }
  .irr-doc { width: 100% !important; max-width: 186mm !important; margin: 0 auto !important; padding: 0 !important; }
  .irr-doc table { width: 100% !important; border-collapse: collapse !important; font-size: 8pt !important; }
  .irr-doc th, .irr-doc td { padding: 3pt 5pt !important; border: 0.5pt solid #999 !important; }
  .irr-doc th { background: #e8e8e8 !important; font-weight: 700 !important; }
}
`;

const formatBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

export function IrrigationReport({
  open,
  onClose,
  schedule,
  system,
  turnoRega,
  doseAdubo,
  avgETo,
  avgETc,
  laminaLiquida,
  laminaBruta,
  efficiency,
  soilTexture,
  soilCad,
  talhaoName,
  areaHa,
  totalPlants,
  cityName,
  dailyRainfall,
  kcInfo,
  costResult,
}: IrrigationReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [technicalNotes, setTechnicalNotes] = useState('');

  if (!open) return null;

  const systemInfo = IRRIGATION_SYSTEMS.find(s => s.id === system)!;
  const today = new Date().toLocaleDateString('pt-BR');
  const totalRainfall = dailyRainfall.reduce((a, b) => a + b, 0);

  const handleGeneratePdf = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const el = reportRef.current;

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 850,
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;

      if (imgHeight <= pdfHeight - margin * 2) {
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, contentWidth, imgHeight);
      } else {
        const pxPerMm = imgHeight / canvas.height;
        const maxSlicePx = (pdfHeight - margin * 2) / pxPerMm;
        let currentY = 0;
        let page = 0;

        while (currentY < canvas.height) {
          if (page > 0) pdf.addPage();
          const sliceH = Math.min(maxSlicePx, canvas.height - currentY);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceH;
          const ctx = pageCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, currentY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
            const destH = (sliceH / canvas.height) * imgHeight;
            pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, contentWidth, destH);
          }
          currentY += sliceH;
          page++;
        }
      }

      pdf.save(`relatorio-irrigacao-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF de irrigação gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = () => {
    const kcLabel = kcInfo ? `${kcInfo.kc} (${kcInfo.phase})` : String(KC_CAFE);
    const message = `*💧 RELATÓRIO DE IRRIGAÇÃO*\n${talhaoName ? `*Talhão:* ${talhaoName}\n` : ''}${areaHa ? `*Área:* ${areaHa} ha\n` : ''}\n*Sistema:* ${systemInfo.icon} ${systemInfo.label}\n*Turno de Rega:* ${turnoRega} dias\n*ETo Média:* ${avgETo.toFixed(2)} mm/dia\n*ETc Média:* ${avgETc.toFixed(2)} mm/dia (Kc ${kcLabel})\n*Lâmina Bruta:* ${laminaBruta.toFixed(1)} mm\n*Eficiência:* ${(efficiency * 100).toFixed(0)}%\n${costResult ? `\n*💰 CUSTOS*\n• Custo por Rega: ${formatBRL(costResult.custoRega)}\n• Custo Mensal: ${formatBRL(costResult.custoMensal)}\n` : ''}\n_Relatório gerado pelo Solo V3. 2026_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-8">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-[850px] mx-4">
        {/* Action bar */}
        <div className="flex flex-wrap gap-3 justify-between items-center p-4 border-b border-border print-hide">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {isGeneratingPdf ? 'Gerando...' : 'Baixar PDF'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareWhatsApp}>
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Document */}
        <div ref={reportRef} className="irr-doc bg-white text-gray-900 mx-auto" style={{ maxWidth: '210mm', fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif" }}>
          <div className="p-6 md:p-10 space-y-6">

            {/* Header */}
            <div className="border-b-2 border-gray-800 pb-4">
              <div className="flex items-center justify-between mb-4">
                <img src={LOGO_URL} alt="Solo" className="h-12 object-contain" />
                <div className="text-right text-xs text-gray-500">
                  <p>Data: {today}</p>
                  {cityName && <p>Local: {cityName}</p>}
                </div>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight text-center uppercase">
                Relatório de Irrigação & Fertirrigação
              </h1>
              <p className="text-center text-sm text-gray-500 mt-1">Cronograma e Análise de Custos</p>
            </div>

            {/* Talhão info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2 text-sm">
              <div><span className="font-semibold text-gray-700">Talhão:</span> <span className="text-gray-900">{talhaoName || '—'}</span></div>
              <div><span className="font-semibold text-gray-700">Área:</span> <span className="text-gray-900">{areaHa ? `${areaHa} ha` : '—'}</span></div>
              <div><span className="font-semibold text-gray-700">Plantas:</span> <span className="text-gray-900">{totalPlants ? totalPlants.toLocaleString('pt-BR') : '—'}</span></div>
              <div><span className="font-semibold text-gray-700">Data:</span> <span className="text-gray-900">{today}</span></div>
            </div>

            {/* System summary */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-3">
                Configuração do Sistema
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="border border-gray-300 rounded p-2 text-center">
                  <p className="text-xs text-gray-500">Sistema</p>
                  <p className="font-semibold text-gray-900">{systemInfo.icon} {systemInfo.label}</p>
                </div>
                <div className="border border-gray-300 rounded p-2 text-center">
                  <p className="text-xs text-gray-500">Textura do Solo</p>
                  <p className="font-semibold text-gray-900">{soilTexture} (CAD: {soilCad} mm)</p>
                </div>
                <div className="border border-gray-300 rounded p-2 text-center">
                  <p className="text-xs text-gray-500">ETc Diária</p>
                  <p className="font-semibold text-gray-900">{avgETc.toFixed(2)} mm/dia</p>
                  {kcInfo && <p className="text-[10px] text-gray-400">Kc {kcInfo.kc} ({kcInfo.phase})</p>}
                </div>
                <div className="border border-gray-300 rounded p-2 text-center">
                  <p className="text-xs text-gray-500">Turno de Rega</p>
                  <p className="font-semibold text-gray-900">{turnoRega} dias</p>
                </div>
              </div>
            </div>

            {/* Lâminas */}
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="border border-gray-300 rounded p-2 text-center bg-blue-50">
                <p className="text-xs text-gray-500">Lâmina Líquida</p>
                <p className="text-lg font-bold text-blue-700">{laminaLiquida.toFixed(1)} mm</p>
              </div>
              <div className="border border-gray-300 rounded p-2 text-center bg-green-50">
                <p className="text-xs text-gray-500">Lâmina Bruta</p>
                <p className="text-lg font-bold text-green-700">{laminaBruta.toFixed(1)} mm</p>
              </div>
              <div className="border border-gray-300 rounded p-2 text-center">
                <p className="text-xs text-gray-500">Eficiência</p>
                <p className="text-lg font-bold text-gray-900">{(efficiency * 100).toFixed(0)}%</p>
              </div>
            </div>

            {/* Fertirrigação */}
            {doseAdubo > 0 && laminaBruta > 0 && (
              <div className="border border-gray-300 rounded p-3 bg-green-50">
                <p className="text-sm font-semibold text-gray-700">Fertirrigação</p>
                <p className="text-sm text-gray-600">
                  Dose: <strong>{doseAdubo} kg/ha</strong> • Concentração: <strong>{(doseAdubo / laminaBruta).toFixed(2)} kg/mm</strong>
                </p>
              </div>
            )}

            {/* 7-day schedule table */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-3">
                📅 Cronograma de Irrigação (7 dias)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-xs uppercase">Data</th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 text-xs uppercase">Temp.</th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 text-xs uppercase">ETo</th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 text-xs uppercase">🌧 Chuva</th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 text-xs uppercase">ETc Líq.</th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 text-xs uppercase">Lâmina</th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 text-xs uppercase">⏱ Tempo</th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 text-xs uppercase">Adubo</th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 text-xs uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((day, idx) => {
                      const h = Math.floor(day.tempoIrrigacaoH);
                      const m = Math.round((day.tempoIrrigacaoH - h) * 60);
                      const tempoStr = day.tempoIrrigacaoH > 0
                        ? (h > 0 ? `${h}h${m > 0 ? `${String(m).padStart(2, '0')}min` : ''}` : `${m}min`)
                        : '—';
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-3 py-1.5 font-medium text-gray-900 capitalize">{day.dayLabel}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-center text-xs text-gray-600">
                            {day.tMax !== undefined ? `${Math.round(day.tMax)}°/${Math.round(day.tMin!)}°` : '—'}
                          </td>
                          <td className="border border-gray-300 px-3 py-1.5 text-center font-mono text-gray-800">{day.etoDay.toFixed(1)}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-center text-gray-800">
                            {day.rainfallMm > 0 ? `${day.rainfallMm}` : '—'}
                          </td>
                          <td className="border border-gray-300 px-3 py-1.5 text-center font-mono text-gray-800">{day.etcNetDay.toFixed(1)}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-center font-semibold text-gray-900">
                            {day.laminaAplicar > 0 ? `${day.laminaAplicar} mm` : '—'}
                          </td>
                          <td className="border border-gray-300 px-3 py-1.5 text-center font-semibold text-blue-700">{tempoStr}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-center text-gray-800">
                            {day.aduboKgHa > 0 ? day.aduboKgHa : '—'}
                          </td>
                          <td className="border border-gray-300 px-3 py-1.5 text-center">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${day.status === 'Irrigar' ? 'bg-blue-100 text-blue-800' : day.status === 'Chuva suficiente' ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-600'}`}>
                              {day.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalRainfall > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  🌧 Total de chuva no período: <strong>{totalRainfall.toFixed(1)} mm</strong> — descontado da lâmina de irrigação.
                </p>
              )}
            </div>

            {/* Costs */}
            {costResult && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-3">
                  💰 Análise de Custos de Energia
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="border border-gray-300 rounded p-2 text-center">
                    <p className="text-xs text-gray-500">Custo por Rega</p>
                    <p className="font-bold text-gray-900">{formatBRL(costResult.custoRega)}</p>
                    <p className="text-[10px] text-gray-400">{costResult.regasMes}x/mês</p>
                  </div>
                  <div className="border border-gray-300 rounded p-2 text-center">
                    <p className="text-xs text-gray-500">Custo Mensal</p>
                    <p className="font-bold text-gray-900">{formatBRL(costResult.custoMensal)}</p>
                  </div>
                  <div className="border border-gray-300 rounded p-2 text-center">
                    <p className="text-xs text-gray-500">Eficiência</p>
                    <p className="font-bold text-gray-900">{formatBRL(costResult.eficienciaRsMmHa)}</p>
                    <p className="text-[10px] text-gray-400">R$/mm/ha</p>
                  </div>
                  <div className="border border-gray-300 rounded p-2 text-center">
                    <p className="text-xs text-gray-500">Tarifa Efetiva</p>
                    <p className="font-bold text-gray-900">{formatBRL(costResult.tarifaEfetiva)}</p>
                    <p className="text-[10px] text-gray-400">R$/kWh</p>
                  </div>
                </div>
              </div>
            )}

            {/* Technical notes */}
            <div className="print-hide">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-3">
                Observações
              </h2>
              <Textarea
                placeholder="Notas técnicas sobre irrigação, ajustes de turno, etc..."
                value={technicalNotes}
                onChange={(e) => setTechnicalNotes(e.target.value)}
                className="min-h-[60px] resize-none bg-white text-gray-800 border-gray-300 text-sm"
              />
            </div>
            {technicalNotes && (
              <div className="text-sm text-gray-700">
                <p className="font-semibold text-gray-600 mb-1">Observações:</p>
                <p>{technicalNotes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-gray-300 pt-4 mt-4">
              <p className="text-xs text-gray-500 italic">
                ETo calculada via Hargreaves-Samani (FAO). Kc café = {kcInfo ? `${kcInfo.kc} (${kcInfo.phase})` : KC_CAFE}. Textura: {soilTexture}.
              </p>
              <div className="grid grid-cols-2 gap-8 mt-6">
                <div className="text-center">
                  <div className="border-b border-gray-800 w-48 mx-auto mb-1 mt-6"></div>
                  <p className="text-sm font-semibold text-gray-700">Responsável Técnico</p>
                  <p className="text-xs text-gray-500">CREA / CFTA</p>
                </div>
                <div className="text-center">
                  <div className="border-b border-gray-800 w-48 mx-auto mb-1 mt-6"></div>
                  <p className="text-sm font-semibold text-gray-700">Produtor</p>
                </div>
              </div>
              <p className="text-center text-xs text-gray-400 mt-4">Relatório gerado pelo Solo V3. 2026</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
