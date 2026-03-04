import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Talhao } from '@/hooks/useTalhoes';

interface RedrawConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talhao: Talhao | undefined;
  pendingRedraw: { geojson: any; areaHa: number; centerLat: number; centerLng: number } | null;
  onConfirm: (geojson: any, areaHa: number, centerLat: number, centerLng: number) => Promise<void>;
  onCancel: () => void;
}

export function RedrawConfirmDialog({ open, onOpenChange, talhao, pendingRedraw, onConfirm, onCancel }: RedrawConfirmDialogProps) {
  const [saving, setSaving] = useState(false);

  if (!talhao || !pendingRedraw) return null;

  const oldArea = talhao.area_ha ?? 0;
  const newArea = pendingRedraw.areaHa;
  const diff = newArea - oldArea;
  const diffPercent = oldArea > 0 ? Math.round((diff / oldArea) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o);
      if (!o) onCancel();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Confirmar Redesenho
          </DialogTitle>
          <DialogDescription>
            Verifique a comparação de área antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="text-center mb-2">
            <p className="text-sm font-semibold text-foreground">{talhao.name}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 items-center">
            <div className="p-3 rounded-xl bg-muted/50 border border-border text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Área Atual</p>
              <p className="text-xl font-bold text-foreground">{oldArea}</p>
              <p className="text-xs text-muted-foreground">ha</p>
            </div>

            <div className="text-center">
              <span className="text-2xl text-muted-foreground">→</span>
            </div>

            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Nova Área</p>
              <p className="text-xl font-bold text-primary">{newArea}</p>
              <p className="text-xs text-muted-foreground">ha</p>
            </div>
          </div>

          {oldArea > 0 && (
            <div className={cn(
              "text-center text-sm font-medium rounded-lg py-1.5",
              diff > 0 ? "text-emerald-600 bg-emerald-500/10" : diff < 0 ? "text-amber-600 bg-amber-500/10" : "text-muted-foreground bg-muted/50"
            )}>
              {diff > 0 ? '+' : ''}{diff.toFixed(2)} ha ({diff > 0 ? '+' : ''}{diffPercent}%)
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                setSaving(true);
                await onConfirm(pendingRedraw.geojson, pendingRedraw.areaHa, pendingRedraw.centerLat, pendingRedraw.centerLng);
                setSaving(false);
              }}
              disabled={saving}
              className="flex-1 gap-2"
            >
              {saving ? 'Salvando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
