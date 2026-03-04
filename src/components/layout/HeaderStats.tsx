import { useFarmData } from '@/hooks/useFarmData';

export function HeaderStats() {
  const { farms, farmCosts } = useFarmData();

  const totalFarms = farms.length;
  const totalFinancial = farmCosts.reduce((sum, cost) => sum + (cost.costPerHectare || 0), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="flex items-center gap-8">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Fazendas</span>
        <span className="text-sm font-semibold text-foreground">{totalFarms}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-sm font-semibold text-foreground">{formatCurrency(totalFinancial)}</span>
      </div>
    </div>
  );
}
