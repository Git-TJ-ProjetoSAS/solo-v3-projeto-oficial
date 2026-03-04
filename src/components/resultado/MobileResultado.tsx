import { useState } from 'react';
import { FileText, FolderOpen, ListChecks, ChevronRight, Wheat, MapPin, FlaskConical, Leaf, Droplets, Beaker } from 'lucide-react';
import { useFarmData } from '@/hooks/useFarmData';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Define available cultures
const CULTURES = [
  { id: 'milho-grao', name: 'Milho Grão' },
  { id: 'milho-silagem', name: 'Milho Silagem' },
  { id: 'soja', name: 'Soja' },
  { id: 'algodao', name: 'Algodão' },
  { id: 'feijao', name: 'Feijão' },
  { id: 'trigo', name: 'Trigo' },
];

type MobileTab = 'documentacao' | 'detalhamento';

export function MobileResultado() {
  const { farms, selectedFarm, setSelectedFarmId } = useFarmData();
  const [selectedCulture, setSelectedCulture] = useState('milho-silagem');
  const [activeTab, setActiveTab] = useState<MobileTab>('detalhamento');

  // Mock PDFs for demonstration
  const mockPdfs = [
    { id: '1', name: 'Recomendação Milho - Jan 2025', date: '15/01/2025' },
    { id: '2', name: 'Análise Completa - Dez 2024', date: '20/12/2024' },
  ];

  return (
    <div className="space-y-6 pb-4">
      {/* Seletores */}
      <div className="space-y-3">
        {/* Fazenda Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            Fazenda
          </label>
          <Select 
            value={selectedFarm?.id || ''} 
            onValueChange={(value) => setSelectedFarmId(value)}
          >
            <SelectTrigger className="w-full h-12 rounded-xl bg-secondary/50 border-0">
              <SelectValue placeholder="Selecione uma fazenda" />
            </SelectTrigger>
            <SelectContent>
              {farms.length === 0 ? (
                <SelectItem value="none" disabled>
                  Nenhuma fazenda cadastrada
                </SelectItem>
              ) : (
                farms.map((farm) => (
                  <SelectItem key={farm.id} value={farm.id}>
                    {farm.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Cultura Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Wheat className="w-3 h-3" />
            Cultura
          </label>
          <Select value={selectedCulture} onValueChange={setSelectedCulture}>
            <SelectTrigger className="w-full h-12 rounded-xl bg-secondary/50 border-0">
              <SelectValue placeholder="Selecione a cultura" />
            </SelectTrigger>
            <SelectContent>
              {CULTURES.map((culture) => (
                <SelectItem key={culture.id} value={culture.id}>
                  {culture.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 p-1 bg-secondary/50 rounded-xl">
        <button
          onClick={() => setActiveTab('documentacao')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all",
            activeTab === 'documentacao'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          <FolderOpen className="w-4 h-4" />
          Documentação
        </button>
        <button
          onClick={() => setActiveTab('detalhamento')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all",
            activeTab === 'detalhamento'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          <ListChecks className="w-4 h-4" />
          Detalhamento
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'documentacao' && (
          <div className="space-y-3 animate-fade-in">
            {!selectedFarm ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderOpen className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Selecione uma fazenda para ver os documentos
                </p>
              </div>
            ) : mockPdfs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhum documento gerado ainda
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete uma análise para gerar relatórios
                </p>
              </div>
            ) : (
              mockPdfs.map((pdf) => (
                <button
                  key={pdf.id}
                  className="w-full flex items-center gap-4 p-4 bg-secondary/30 rounded-2xl hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{pdf.name}</p>
                    <p className="text-xs text-muted-foreground">{pdf.date}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        )}

        {activeTab === 'detalhamento' && (
          <div className="space-y-4 animate-fade-in">
            {!selectedFarm ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ListChecks className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Selecione uma fazenda para ver as recomendações
                </p>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-secondary/30 rounded-2xl border border-primary/30">
                    <p className="text-xs text-muted-foreground mb-1">V% Atual</p>
                    <p className="text-2xl font-bold text-foreground">52%</p>
                  </div>
                  <div className="p-4 bg-secondary/30 rounded-2xl border border-primary/30">
                    <p className="text-xs text-muted-foreground mb-1">V% Meta</p>
                    <p className="text-2xl font-bold text-foreground">65%</p>
                  </div>
                </div>

                {/* Recommendation Items */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">O que fazer</h3>
                  
                  <div className="p-4 bg-secondary rounded-2xl border border-primary/30">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <FlaskConical className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold text-foreground">1. Calagem</p>
                        <p className="text-sm text-muted-foreground">
                          Espalhe <span className="font-medium text-foreground">2.5 t/ha</span> de calcário dolomítico
                        </p>
                        <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                          <p><span className="font-medium">Quando:</span> 60-90 dias antes do plantio</p>
                          <p><span className="font-medium">Como:</span> A lanço, incorporar com grade</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-secondary rounded-2xl border border-primary/30">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Beaker className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold text-foreground">2. Correção de Potássio</p>
                        <p className="text-sm text-muted-foreground">
                          Espalhe <span className="font-medium text-foreground">150 kg/ha</span> de KCl
                        </p>
                        <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                          <p><span className="font-medium">Quando:</span> 30-45 dias antes do plantio</p>
                          <p><span className="font-medium">Como:</span> A lanço, junto com a calagem</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-secondary rounded-2xl border border-primary/30">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Leaf className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold text-foreground">3. Plantio</p>
                        <p className="text-sm text-muted-foreground">
                          Coloque <span className="font-medium text-foreground">350 kg/ha</span> de NPK 08-28-16
                        </p>
                        <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                          <p><span className="font-medium">Quando:</span> No dia do plantio</p>
                          <p><span className="font-medium">Como:</span> No sulco, junto com a semente</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-secondary rounded-2xl border border-primary/30">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Droplets className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold text-foreground">4. Cobertura</p>
                        <p className="text-sm text-muted-foreground">
                          Espalhe <span className="font-medium text-foreground">200 kg/ha</span> de Ureia
                        </p>
                        <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                          <p><span className="font-medium">Quando:</span> V4 (60kg) e V8 (140kg)</p>
                          <p><span className="font-medium">Como:</span> A lanço, antes de chuva</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Investment */}
                <div className="p-4 bg-primary text-primary-foreground rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">Investimento Total</p>
                      <p className="text-xs opacity-60">por hectare</p>
                    </div>
                    <p className="text-2xl font-bold">R$ 1.850</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
