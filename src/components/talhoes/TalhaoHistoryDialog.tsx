import { useState } from 'react';
import { TalhaoHistoryEntry, useTalhaoHistory } from '@/hooks/useTalhaoHistory';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  History,
  Loader2,
  Trash2,
  TrendingUp,
  DollarSign,
  Beaker,
  ShieldAlert,
  Leaf,
  Package,
  ChevronDown,
  ChevronUp,
  Calendar,
  Droplets,
  ArrowDownToLine,
} from 'lucide-react';

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const levelLabels: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  muito_alta: 'Muito Alta',
};

function HistoryEntryCard({
  entry,
  onDelete,
}: {
  entry: TalhaoHistoryEntry;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasSoil = !!entry.soil_data;
  const hasInsumos = Array.isArray(entry.insumos_data) && entry.insumos_data.length > 0;
  const hasTreatment = !!entry.treatment_plan_data;
  const hasLeaf = !!entry.leaf_analysis_data;
  const hasLiming = !!entry.liming_data;
  const hasDrench = !!entry.drench_data;
  const hasSpraying = !!entry.spraying_data;

  const soil = entry.soil_data as Record<string, number> | null;
  const liming = entry.liming_data as Record<string, any> | null;
  const treatment = entry.treatment_plan_data as Record<string, any> | null;
  const drench = entry.drench_data as Record<string, any> | null;
  const sprayingData = entry.spraying_data as Record<string, any> | null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Calendar className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{fmtDate(entry.created_at)}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {entry.productivity_target} sc/ha
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {levelLabels[entry.productivity_level] || entry.productivity_level}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-foreground">{fmtCurrency(entry.cost_per_ha)}/ha</p>
          {entry.cost_per_saca > 0 && (
            <p className="text-[10px] text-muted-foreground">{fmtCurrency(entry.cost_per_saca)}/sc</p>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/50">
          {/* Cost breakdown */}
          <div className="grid grid-cols-2 gap-2">
            {entry.liming_cost_per_ha > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50">
                <Beaker className="w-3.5 h-3.5 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Calagem</p>
                  <p className="text-xs font-semibold">{fmtCurrency(entry.liming_cost_per_ha)}/ha</p>
                </div>
              </div>
            )}
            {entry.treatment_cost_per_ha > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50">
                <ShieldAlert className="w-3.5 h-3.5 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Defensivos</p>
                  <p className="text-xs font-semibold">{fmtCurrency(entry.treatment_cost_per_ha)}/ha</p>
                </div>
              </div>
            )}
          </div>

          {/* Soil summary */}
          {hasSoil && soil && (
            <div className="p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2 mb-2">
                <Beaker className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground uppercase">Solo</p>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {['ca', 'mg', 'k', 'p'].map(key => (
                  <div key={key} className="text-center p-1.5 rounded bg-background/50">
                    <p className="text-[9px] text-muted-foreground uppercase">{key}</p>
                    <p className="text-xs font-semibold">{soil[key] ?? '—'}</p>
                  </div>
                ))}
              </div>
              {soil.vPercent != null && (
                <p className="text-xs mt-2 text-center">
                  V%: <span className="font-semibold">{Number(soil.vPercent).toFixed(1)}%</span>
                </p>
              )}
            </div>
          )}

          {/* Liming summary */}
          {hasLiming && liming && liming.nc > 0 && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
              <p className="text-xs text-muted-foreground">Calagem</p>
              <p className="text-lg font-bold">{Number(liming.nc).toFixed(2)} t/ha</p>
              {liming.productName && (
                <p className="text-[10px] text-primary">{liming.productName}</p>
              )}
            </div>
          )}

          {/* Treatment summary */}
          {hasTreatment && treatment && treatment.entries && (
            <div className="p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Tratamento ({(treatment.entries as any[]).length} alvo(s))
                </p>
              </div>
              <div className="space-y-1">
                {(treatment.entries as any[]).slice(0, 4).map((e: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="truncate text-muted-foreground">{e.produto}</span>
                    <span className="font-medium shrink-0 ml-2">{fmtCurrency(e.costPerHa)}/ha</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spraying summary */}
          {hasSpraying && sprayingData && (
            <div className="p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground uppercase">Pulverização</p>
              </div>
              {sprayingData.equipment && (
                <p className="text-xs text-muted-foreground mb-1">
                  Equipamento: <span className="font-medium text-foreground">{sprayingData.equipment?.type || sprayingData.equipmentType || '—'}</span>
                  {sprayingData.equipment?.applicationRate && ` • ${sprayingData.equipment.applicationRate} L/ha`}
                </p>
              )}
              {Array.isArray(sprayingData.products) && sprayingData.products.length > 0 && (
                <div className="space-y-1 mt-1">
                  {(sprayingData.products as any[]).slice(0, 4).map((p: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="truncate text-muted-foreground">{p.name || p.insumoNome || '—'}</span>
                      <span className="font-medium shrink-0 ml-2">{p.doseInput || p.dose || '—'} {p.unit || ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Drench summary */}
          {hasDrench && drench && (
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownToLine className="w-3.5 h-3.5 text-accent-foreground" />
                <p className="text-xs font-medium text-muted-foreground uppercase">Drench no Colo</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs mb-2">
                <div className="p-1.5 rounded bg-background/50 text-center">
                  <p className="text-[9px] text-muted-foreground">Vol/planta</p>
                  <p className="font-semibold">{drench.volumePerPlantMl || '—'} mL</p>
                </div>
                <div className="p-1.5 rounded bg-background/50 text-center">
                  <p className="text-[9px] text-muted-foreground">Plantas/ha</p>
                  <p className="font-semibold">{drench.populationPerHa?.toLocaleString('pt-BR') || '—'}</p>
                </div>
                <div className="p-1.5 rounded bg-background/50 text-center">
                  <p className="text-[9px] text-muted-foreground">Equipamento</p>
                  <p className="font-semibold">{drench.equipment === 'costal' ? 'Costal' : 'Barra'}</p>
                </div>
                <div className="p-1.5 rounded bg-background/50 text-center">
                  <p className="text-[9px] text-muted-foreground">Área</p>
                  <p className="font-semibold">{drench.hectares || '—'} ha</p>
                </div>
              </div>
              {Array.isArray(drench.products) && drench.products.length > 0 && (
                <div className="space-y-1">
                  {(drench.products as any[]).map((p: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="truncate text-muted-foreground">{p.name}</span>
                      <span className="font-medium shrink-0 ml-2">{p.concentrationGPerL} g/L • {p.totalProductKg?.toFixed(2)} kg</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Insumos count */}
          {hasInsumos && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/30">
              <Package className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {(entry.insumos_data as any[]).length} insumo(s) selecionados
              </p>
            </div>
          )}

          {/* Leaf analysis badge */}
          {hasLeaf && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/30">
              <Leaf className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Análise foliar registrada
              </p>
            </div>
          )}

          {/* Delete */}
          <div className="flex justify-end pt-1">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1.5 h-7 text-xs">
                  <Trash2 className="w-3 h-3" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir registro</AlertDialogTitle>
                  <AlertDialogDescription>
                    Deseja excluir este registro do histórico? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(entry.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}

interface TalhaoHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talhaoId: string;
  talhaoName: string;
}

export function TalhaoHistoryDialog({ open, onOpenChange, talhaoId, talhaoName }: TalhaoHistoryDialogProps) {
  const { history, loading, deleteHistoryEntry } = useTalhaoHistory(talhaoId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Histórico — {talhaoName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">
              Nenhum planejamento salvo para este talhão.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ao finalizar um planejamento de café, salve-o para manter o histórico.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {history.length} registro(s)
            </p>
            {history.map(entry => (
              <HistoryEntryCard
                key={entry.id}
                entry={entry}
                onDelete={deleteHistoryEntry}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
