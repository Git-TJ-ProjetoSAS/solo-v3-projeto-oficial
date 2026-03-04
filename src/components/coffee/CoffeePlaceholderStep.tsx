import { Construction, Leaf, Bug, Droplets, Apple } from 'lucide-react';
import { useCoffee } from '@/contexts/CoffeeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CoffeeMicroManagement } from './CoffeeMicroManagement';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ROTEIRO_FITOSSANITARIO = [
  {
    periodo: 'Pós-Colheita',
    alvo: 'Limpeza de Copa',
    acao: 'Adubação foliar com Cobre + Zinco',
    icon: Leaf,
  },
  {
    periodo: 'Floração',
    alvo: 'Ferrugem / Phoma',
    acao: 'Fungicida sistêmico + Protetor',
    icon: Droplets,
  },
  {
    periodo: 'Chumbinho',
    alvo: 'Bicho-mineiro / Broca',
    acao: 'Monitoramento e inseticida se > 5% infestação',
    icon: Bug,
  },
  {
    periodo: 'Enchimento',
    alvo: 'Antracnose',
    acao: 'Reforço de adubação foliar com Potássio e Boro',
    icon: Apple,
  },
];

export function CoffeePlaceholderStep() {
  const { currentStepInfo, coffeeData } = useCoffee();

  const coffeeLabel = coffeeData.coffeeType === 'conilon' ? 'Conilon' : 'Arábica';

  return (
    <div style={{ animation: 'fade-in 0.3s ease-out' }}>
      <div className="flex flex-col items-center justify-center py-8 text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-5">
          <Construction className="w-7 h-7 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {currentStepInfo.title} — Café {coffeeLabel}
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Resumo final do planejamento em desenvolvimento. Confira abaixo o roteiro fitossanitário sugerido.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Leaf className="w-5 h-5 text-primary" />
            Roteiro Fitossanitário
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Cronograma de manejo fitossanitário por fase fenológica do café
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Período</TableHead>
                  <TableHead className="w-[180px]">Alvo Principal</TableHead>
                  <TableHead>Ação Sugerida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROTEIRO_FITOSSANITARIO.map((item) => (
                  <TableRow key={item.periodo}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <item.icon className="w-4 h-4 text-primary shrink-0" />
                        {item.periodo}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.alvo}</TableCell>
                    <TableCell>{item.acao}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3 p-4">
            {ROTEIRO_FITOSSANITARIO.map((item) => (
              <div
                key={item.periodo}
                className="rounded-lg border bg-card p-3 space-y-1.5"
              >
                <div className="flex items-center gap-2 font-medium text-sm">
                  <item.icon className="w-4 h-4 text-primary shrink-0" />
                  {item.periodo}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Alvo:</span> {item.alvo}
                </p>
                <p className="text-xs">
                  <span className="font-medium text-foreground">Ação:</span> {item.acao}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* === MANEJO DE MICRONUTRIENTES === */}
      <div className="mt-6">
        <CoffeeMicroManagement />
      </div>
    </div>
  );
}
