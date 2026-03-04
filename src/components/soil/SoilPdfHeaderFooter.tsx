import { LOGO_URL } from '@/lib/constants';

interface HeaderProps {
  talhaoName?: string;
}

interface FooterProps {
  consultorName?: string | null;
  creaArt?: string | null;
}

export function SoilPdfHeader({ talhaoName }: HeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6 print-header">
      <div className="flex items-center gap-3">
        <img src={LOGO_URL} alt="Solo V3" className="h-10 w-auto" crossOrigin="anonymous" />
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-tight">Relatório de Evolução do Solo</h1>
          {talhaoName && (
            <p className="text-sm text-slate-500">Talhão: {talhaoName}</p>
          )}
        </div>
      </div>
      <div className="text-right text-xs text-slate-400">
        <p>Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
        <p>Solo V3 — Gestão Agronômica</p>
      </div>
    </div>
  );
}

export function SoilPdfFooter({ consultorName, creaArt }: FooterProps) {
  return (
    <div className="border-t border-slate-200 pt-4 mt-8 text-[10px] text-slate-400 text-center print-footer">
      <p>Este relatório foi gerado automaticamente pelo sistema Solo V3 — Gestão Agronômica Inteligente.</p>
      {creaArt ? (
        <p className="mt-1 font-semibold text-slate-600">
          Responsável Técnico: {consultorName || 'Consultor'} — CREA/CFTA: {creaArt}
        </p>
      ) : (
        <p className="mt-1">As recomendações técnicas devem ser validadas por um Engenheiro Agrônomo com registro no CREA.</p>
      )}
      <p className="mt-1">Documento sem valor de laudo técnico. Uso exclusivo para acompanhamento interno.</p>
    </div>
  );
}
