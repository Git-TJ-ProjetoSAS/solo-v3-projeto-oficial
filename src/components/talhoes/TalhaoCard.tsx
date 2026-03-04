import { useState } from 'react';
import { Talhao } from '@/hooks/useTalhoes';
import { cn } from '@/lib/utils';
import { MapPin, TreePine, Ruler, Coffee, BarChart3, DollarSign, Trash2, History, Pencil, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TalhaoHistoryDialog } from './TalhaoHistoryDialog';
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

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface TalhaoCardProps {
  talhao: Talhao;
  onDelete: (id: string) => void;
  onEdit: (talhao: Talhao) => void;
}

export function TalhaoCard({ talhao, onDelete, onEdit }: TalhaoCardProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const isConilon = talhao.coffee_type === 'conilon';
  const accentColor = isConilon ? 'sky' : 'emerald';

  const plantsPerHa = talhao.area_ha > 0
    ? Math.round(talhao.total_plants / talhao.area_ha)
    : 0;

  return (
    <div
      className={cn(
        'rounded-2xl border overflow-hidden transition-all hover:shadow-md',
        isConilon
          ? 'border-sky-500/30 bg-sky-500/5'
          : 'border-emerald-500/30 bg-emerald-500/5'
      )}
    >
      {/* Header bar */}
      <div className={cn(
        'h-1.5',
        isConilon ? 'bg-sky-500' : 'bg-emerald-500'
      )} />

      <div className="p-5 space-y-4">
        {/* Title + type badge */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">{talhao.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                isConilon
                  ? 'bg-sky-500/15 text-sky-600'
                  : 'bg-emerald-500/15 text-emerald-600'
              )}>
                <Coffee className="w-3 h-3" />
                {isConilon ? 'Conilon' : 'Arábica'}
              </span>
              {talhao.variety && (
                <span className="text-xs text-muted-foreground">{talhao.variety}</span>
              )}
              {talhao.irrigated && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600">
                  <Droplets className="w-3 h-3" />
                  {talhao.irrigation_system === 'gotejamento' ? 'Gotejamento' : talhao.irrigation_system === 'aspersao' ? 'Aspersão' : 'Pivô'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary h-8 w-8" onClick={() => onEdit(talhao)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Talhão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir "{talhao.name}"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(talhao.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-background/60">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Área</p>
              <p className="text-sm font-semibold">{talhao.area_ha} ha</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-background/60">
            <TreePine className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Covas</p>
              <p className="text-sm font-semibold">{talhao.total_plants.toLocaleString('pt-BR')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-background/60">
            <Ruler className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Espaçamento</p>
              <p className="text-sm font-semibold">{talhao.row_spacing_cm} × {talhao.plant_spacing_cm} cm</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-background/60">
            <BarChart3 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Plantas/ha</p>
              <p className="text-sm font-semibold">{plantsPerHa.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </div>

        {/* Financial metrics */}
        {(talhao.productivity_target > 0 || talhao.cost_per_ha > 0) && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
            <div className="text-center p-2 rounded-lg bg-background/60">
              <p className="text-[10px] text-muted-foreground uppercase">Meta</p>
              <p className="text-sm font-bold">{talhao.productivity_target} sc/ha</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/60">
              <p className="text-[10px] text-muted-foreground uppercase">R$/ha</p>
              <p className="text-sm font-bold">{fmtCurrency(talhao.cost_per_ha)}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/60">
              <p className="text-[10px] text-muted-foreground uppercase">R$/Saca</p>
              <p className="text-sm font-bold">
                {talhao.cost_per_saca > 0 ? fmtCurrency(talhao.cost_per_saca) : '—'}
              </p>
            </div>
          </div>
        )}

        {/* Notes */}
        {talhao.notes && (
          <p className="text-xs text-muted-foreground italic border-t border-border/50 pt-2">
            {talhao.notes}
          </p>
        )}

        {/* History button */}
        <div className="border-t border-border/50 pt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-xs"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="w-3.5 h-3.5" />
            Ver Histórico
          </Button>
        </div>
      </div>

      <TalhaoHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        talhaoId={talhao.id}
        talhaoName={talhao.name}
      />
    </div>
  );
}
