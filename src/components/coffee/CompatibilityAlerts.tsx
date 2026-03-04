import { useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { XCircle, AlertTriangle, ArrowDown, ShieldAlert, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type ClassifiedProduct,
  type CompatAlert,
  type CompatGroup,
  GROUP_INFO,
  classifyInsumo,
  checkMixCompatibility,
  getInjectionOrder,
} from '@/lib/compatibilityEngine';

interface InsumoLike {
  id: string;
  nome: string;
  tipo_produto: string;
  macro_n?: number;
  macro_p2o5?: number;
  macro_k2o?: number;
  macro_s?: number;
  micro_b?: number;
  micro_zn?: number;
  micro_mn?: number;
  micro_cu?: number;
  micro_fe?: number;
}

interface ProductInMix {
  id: string;
  insumoId: string;
  name: string;
  type: string;
}

interface CompatibilityAlertsProps {
  products: ProductInMix[];
  insumoOptions: InsumoLike[];
}

export function CompatibilityAlerts({ products, insumoOptions }: CompatibilityAlertsProps) {
  const classified = useMemo<ClassifiedProduct[]>(() => {
    return products.map(p => {
      const insumo = insumoOptions.find(i => i.id === p.insumoId);
      const group: CompatGroup = insumo
        ? classifyInsumo(insumo)
        : 'C'; // default neutral
      return { id: p.id, name: p.name, type: p.type, group };
    });
  }, [products, insumoOptions]);

  const alerts = useMemo(() => checkMixCompatibility(classified), [classified]);
  const injectionOrder = useMemo(() => getInjectionOrder(classified), [classified]);

  if (products.length < 2 && alerts.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Group badges for each product */}
      {classified.length >= 2 && (
        <div className="p-3 bg-secondary rounded-xl space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Classificação de Compatibilidade</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {classified.map(p => {
              const info = GROUP_INFO[p.group];
              return (
                <div key={p.id} className="flex items-center gap-1.5">
                  <Badge variant="outline" className={cn('text-[10px] border', info.badgeColor)}>
                    {info.label}
                  </Badge>
                  <span className="text-xs text-foreground">{p.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.map((alert, idx) => (
        <Alert
          key={idx}
          variant="destructive"
          className={cn(
            'border-2',
            alert.level === 'error'
              ? 'border-destructive bg-destructive/10'
              : 'border-yellow-500 bg-yellow-500/10'
          )}
        >
          {alert.level === 'error' ? (
            <XCircle className="h-5 w-5 text-destructive" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          )}
          <AlertTitle className={cn(
            'font-bold',
            alert.level === 'error' ? 'text-destructive' : 'text-yellow-500'
          )}>
            {alert.title}
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p className="text-sm">{alert.message}</p>
            {alert.suggestion && (
              <p className="text-sm font-medium text-foreground">
                💡 {alert.suggestion}
              </p>
            )}
            <div className="flex flex-wrap gap-1 mt-1">
              {alert.products.map((name, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">{name}</Badge>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      ))}

      {/* Injection Order */}
      {injectionOrder && (
        <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-sm text-foreground">Sequência de Injeção Recomendada</h4>
          </div>
          <p className="text-xs text-muted-foreground">Não misture no tanque! Injete nesta ordem:</p>
          <div className="space-y-1.5">
            {injectionOrder.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                {i > 0 && <ArrowDown className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />}
                <span className="text-sm font-medium">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
