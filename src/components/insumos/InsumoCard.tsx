import { Package, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { InsumoFormData } from '@/types/insumo';

interface InsumoCardProps {
  insumo: InsumoFormData;
  onClick?: () => void;
}

export function InsumoCard({ insumo, onClick }: InsumoCardProps) {
  const displayPrice = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const unitPrice = insumo.tamanhoUnidade > 0 
    ? insumo.preco / insumo.tamanhoUnidade 
    : 0;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors duration-150 group"
      onClick={onClick}
    >
      {/* Icon / Photo */}
      <div className="w-10 h-10 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {insumo.fotoUrl ? (
          <img src={insumo.fotoUrl} alt={insumo.nome} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-5 h-5 text-muted-foreground/60" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {insumo.nome}
          </p>
          <Badge
            variant={insumo.status === 'ativo' ? 'default' : 'secondary'}
            className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0"
          >
            {insumo.status === 'ativo' ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {insumo.marca} • {insumo.tipoProduto}
        </p>
      </div>

      {/* Qty + Price */}
      <div className="text-right flex-shrink-0">
        <p className="font-semibold text-sm text-primary">{displayPrice(insumo.preco)}</p>
        <p className="text-[11px] text-muted-foreground">
          {insumo.tamanhoUnidade} {insumo.medida === 'kg' ? 'kg' : 'L'}
          {unitPrice > 0 && ` • ${displayPrice(unitPrice)}/${insumo.medida === 'kg' ? 'kg' : 'L'}`}
        </p>
      </div>

      <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
    </div>
  );
}
