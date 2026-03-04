import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle, ArrowDown, Leaf, Sprout, Info, Droplets, Shield, SprayCan, Bug,
  Plus, Trash2, Search, Package,
} from 'lucide-react';
import { useCoffee } from '@/contexts/CoffeeContext';
import { useTalhoes } from '@/hooks/useTalhoes';
import { useInsumos } from '@/hooks/useInsumos';
import {
  calcularRecomendacao,
  gerarParcelamento,
  PULVERIZACAO_PADRAO,
  PULVERIZACAO_MENSAL,
  APLICACOES_SOLO,
  OBSERVACOES_MANEJO,
  type CalcResult,
  type ParcelRow,
} from '@/data/coffeePlantingReference';

function fmt(v: number, decimals = 2): string {
  return v.toFixed(decimals).replace('.', ',');
}

/** Check if talhão is in its first year of planting (within 12 months) */
function isFirstYearPlanting(plantingMonth: number, plantingYear: number): boolean {
  const now = new Date();
  const plantingDate = new Date(plantingYear, plantingMonth - 1);
  const diffMs = now.getTime() - plantingDate.getTime();
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30);
  return diffMonths >= 0 && diffMonths <= 24;
}

// ─── Dynamic product types ──────────────────────────────────

interface DynamicProduct {
  id: string;
  nome: string;
  dose: string;
  insumoId: string | null; // null = manual/reference entry
}

interface DynamicMonthEntry {
  mes: string;
  produtos: DynamicProduct[];
}

interface DynamicSoilApp {
  momento: string;
  descricao: string;
  produtos: DynamicProduct[];
  instrucao: string;
}

// Types relevant for spraying
const SPRAY_TYPES = ['Foliar', 'Fungicida', 'Inseticida', 'Adjuvantes', 'Bioestimulante'];
// Types relevant for soil/drench
const DRENCH_TYPES = ['Inseticida', 'Fungicida', 'Bioestimulante', 'Matéria Orgânica', 'Foliar'];

let _idCounter = 0;
function nextId() {
  return `dp_${++_idCounter}_${Date.now()}`;
}

// Initialize from reference data
function initBaseProducts(): DynamicProduct[] {
  return PULVERIZACAO_PADRAO.map(p => ({
    id: nextId(),
    nome: p.nome,
    dose: p.dose,
    insumoId: null,
  }));
}

function initMonthlyProducts(): DynamicMonthEntry[] {
  return PULVERIZACAO_MENSAL.map(entry => ({
    mes: entry.mes,
    produtos: entry.produtos.map(p => ({
      id: nextId(),
      nome: p.nome,
      dose: p.dose,
      insumoId: null,
    })),
  }));
}

function initSoilApps(): DynamicSoilApp[] {
  return APLICACOES_SOLO.map(app => ({
    momento: app.momento,
    descricao: app.descricao,
    instrucao: app.instrucao,
    produtos: app.produtos.map(p => ({
      id: nextId(),
      nome: p.nome,
      dose: p.dose,
      insumoId: null,
    })),
  }));
}

// ─── Product Picker Component ─────────────────────────────

interface ProductPickerProps {
  filterTypes: string[];
  onSelect: (nome: string, insumoId: string) => void;
}

function ProductPicker({ filterTypes, onSelect }: ProductPickerProps) {
  const { insumos, loading } = useInsumos();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const active = insumos.filter(i =>
      i.status === 'ativo' &&
      filterTypes.includes(i.tipoProduto) &&
      i.culturas?.includes('Café')
    );
    if (!search.trim()) return active;
    const q = search.toLowerCase();
    return active.filter(i =>
      i.nome.toLowerCase().includes(q) ||
      i.marca.toLowerCase().includes(q)
    );
  }, [insumos, filterTypes, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Catálogo
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-7 h-8 text-sm"
            />
          </div>
        </div>
        <ScrollArea className="max-h-56">
          {loading ? (
            <p className="text-xs text-muted-foreground p-3 text-center">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">Nenhum produto encontrado</p>
          ) : (
            <div className="p-1">
              {filtered.map(i => (
                <button
                  key={i.id}
                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent/50 flex items-center gap-2"
                  onClick={() => {
                    onSelect(i.nome, i.id);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="truncate">
                    <span className="font-medium">{i.nome}</span>
                    <span className="text-muted-foreground text-xs ml-1">({i.tipoProduto})</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// ─── Editable Product Row ──────────────────────────────────

interface ProductRowProps {
  product: DynamicProduct;
  onDoseChange: (id: string, dose: string) => void;
  onRemove: (id: string) => void;
}

function ProductRow({ product, onDoseChange, onRemove }: ProductRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-1.5">
          {product.insumoId && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0">catálogo</Badge>
          )}
          {product.nome}
        </div>
      </TableCell>
      <TableCell className="text-right w-32">
        <Input
          value={product.dose}
          onChange={e => onDoseChange(product.id, e.target.value)}
          className="h-7 text-sm text-right"
        />
      </TableCell>
      <TableCell className="w-10">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(product.id)}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ─── Main Component ─────────────────────────────────────────

export function CoffeePlantingFertStep() {
  const { coffeeData } = useCoffee();
  const { talhoes } = useTalhoes();

  // Dynamic state for spraying & drench
  const [baseProducts, setBaseProducts] = useState<DynamicProduct[]>(initBaseProducts);
  const [monthlyProducts, setMonthlyProducts] = useState<DynamicMonthEntry[]>(initMonthlyProducts);
  const [soilApps, setSoilApps] = useState<DynamicSoilApp[]>(initSoilApps);

  // ─── Generic handlers ──────────────────────────────────
  const addToBase = useCallback((nome: string, insumoId: string) => {
    setBaseProducts(prev => [...prev, { id: nextId(), nome, dose: 'conforme rótulo', insumoId }]);
  }, []);

  const updateBaseDose = useCallback((id: string, dose: string) => {
    setBaseProducts(prev => prev.map(p => p.id === id ? { ...p, dose } : p));
  }, []);

  const removeBase = useCallback((id: string) => {
    setBaseProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const addToMonth = useCallback((mesIdx: number, nome: string, insumoId: string) => {
    setMonthlyProducts(prev => prev.map((entry, i) =>
      i === mesIdx
        ? { ...entry, produtos: [...entry.produtos, { id: nextId(), nome, dose: 'conforme rótulo', insumoId }] }
        : entry
    ));
  }, []);

  const updateMonthDose = useCallback((mesIdx: number, id: string, dose: string) => {
    setMonthlyProducts(prev => prev.map((entry, i) =>
      i === mesIdx
        ? { ...entry, produtos: entry.produtos.map(p => p.id === id ? { ...p, dose } : p) }
        : entry
    ));
  }, []);

  const removeMonthProduct = useCallback((mesIdx: number, id: string) => {
    setMonthlyProducts(prev => prev.map((entry, i) =>
      i === mesIdx
        ? { ...entry, produtos: entry.produtos.filter(p => p.id !== id) }
        : entry
    ));
  }, []);

  const addToSoilApp = useCallback((appIdx: number, nome: string, insumoId: string) => {
    setSoilApps(prev => prev.map((app, i) =>
      i === appIdx
        ? { ...app, produtos: [...app.produtos, { id: nextId(), nome, dose: 'conforme rótulo', insumoId }] }
        : app
    ));
  }, []);

  const updateSoilDose = useCallback((appIdx: number, id: string, dose: string) => {
    setSoilApps(prev => prev.map((app, i) =>
      i === appIdx
        ? { ...app, produtos: app.produtos.map(p => p.id === id ? { ...p, dose } : p) }
        : app
    ));
  }, []);

  const removeSoilProduct = useCallback((appIdx: number, id: string) => {
    setSoilApps(prev => prev.map((app, i) =>
      i === appIdx
        ? { ...app, produtos: app.produtos.filter(p => p.id !== id) }
        : app
    ));
  }, []);

  // ─── Talhão & calc logic (unchanged) ──────────────────
  const talhao = useMemo(() => {
    if (!coffeeData.selectedTalhaoId) return null;
    return talhoes.find(t => t.id === coffeeData.selectedTalhaoId) ?? null;
  }, [coffeeData.selectedTalhaoId, talhoes]);

  const culturaNome = useMemo(() => {
    if (!talhao) return '';
    if (talhao.coffee_type === 'conilon' && talhao.irrigated) return 'Café Conilon (Irrigado)';
    return 'Café Arábica (Sequeiro)';
  }, [talhao]);

  const plantas = talhao?.total_plants ?? 0;
  const pSolo = coffeeData.soil?.p ?? 0;
  const kSolo = coffeeData.soil?.k ?? 0;

  const isArabica = culturaNome.includes('Arábica');
  const isFirstYear = talhao
    ? isFirstYearPlanting((talhao as any).planting_month ?? 1, (talhao as any).planting_year ?? 2025)
    : false;

  const result = useMemo<CalcResult | null>(() => {
    if (!culturaNome || plantas <= 0) return null;
    return calcularRecomendacao(culturaNome, plantas, pSolo, kSolo);
  }, [culturaNome, plantas, pSolo, kSolo]);

  const parcelas = useMemo<ParcelRow[]>(() => {
    if (!result || !culturaNome) return [];
    return gerarParcelamento(culturaNome, result);
  }, [culturaNome, result]);

  // ─── Guard renders ────────────────────────────────────
  if (!talhao) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Info className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Selecione um talhão para ver a recomendação de adubação do 1º ano.</p>
        </CardContent>
      </Card>
    );
  }

  if (!isFirstYear) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Sprout className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Este talhão não está no 1º ano de plantio.
            A recomendação de adubação de plantio só se aplica a talhões plantados recentemente.
          </p>
          <Badge variant="secondary" className="mt-2">
            Plantado em {String((talhao as any).planting_month ?? '?').padStart(2, '0')}/{(talhao as any).planting_year ?? '?'}
          </Badge>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
          <p className="text-sm text-muted-foreground">
            Preencha a análise de solo (P e K) na etapa anterior para gerar a recomendação.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Leaf className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Adubação 1º Ano – Plantio</h2>
          <p className="text-sm text-muted-foreground">
            {culturaNome} • {plantas.toLocaleString('pt-BR')} plantas
          </p>
        </div>
      </div>

      {/* Arábica alert */}
      {isArabica && (
        <Alert className="border-yellow-500/30 bg-yellow-500/5">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-sm">
            <strong>Atenção:</strong> Para adubação de sequeiro, certifique-se de realizar a mistura correta de fontes em pó com os granulados ou opte por fórmulas comerciais prontas para evitar segregação dos micronutrientes.
          </AlertDescription>
        </Alert>
      )}

      {/* MAP highlight card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ArrowDown className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Plantio – Fundo de Sulco (MAP)</CardTitle>
          </div>
          <CardDescription>Aplicação única no momento do plantio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Dose P₂O₅</p>
              <p className="text-lg font-semibold">{fmt(result.doseP2O5, 0)} g/pl</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">MAP / planta</p>
              <p className="text-lg font-semibold">{fmt(result.gMapPlanta)} g</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total MAP</p>
              <p className="text-lg font-semibold text-primary">{fmt(result.totalMapKg)} kg</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Desconto N (MAP)</p>
              <p className="text-lg font-semibold">{fmt(result.descontoNMap)} g/pl</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Desconto N (Calcinit)</p>
              <p className="text-lg font-semibold">{fmt(result.descontoNCalcinit)} g/pl</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Uréia Total</p>
            <p className="text-lg font-bold">{fmt(result.totalUreiaKg)} kg</p>
            <Badge variant="secondary" className="text-xs mt-1">{fmt(result.gUreiaPlanta)} g/pl</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">KCl Total</p>
            <p className="text-lg font-bold">{fmt(result.totalKclKg)} kg</p>
            <Badge variant="secondary" className="text-xs mt-1">{fmt(result.gKclPlanta)} g/pl</Badge>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Calcinit Total</p>
            <p className="text-lg font-bold">{fmt(result.totalCalcinitKg)} kg</p>
            <Badge variant="secondary" className="text-xs mt-1">{fmt(result.gCalcinitPlanta)} g/pl</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Sulf. Magnésio</p>
            <p className="text-lg font-bold">{fmt(result.totalMgKg)} kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Ác. Bórico</p>
            <p className="text-lg font-bold">{fmt(result.totalBKg)} kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Sulf. Manganês</p>
            <p className="text-lg font-bold">{fmt(result.totalMnKg)} kg</p>
          </CardContent>
        </Card>
      </div>

      {/* Parcelamento table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Parcelamento Mensal – Cobertura</CardTitle>
          <CardDescription>
            Distribuição mensal conforme a fase fenológica ({culturaNome})
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
             <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Uréia (kg)</TableHead>
                <TableHead className="text-right">KCl (kg)</TableHead>
                <TableHead className="text-right">Calcinit (kg)</TableHead>
                <TableHead className="text-right">Sulf. Mg (kg)</TableHead>
                <TableHead className="text-right">Sulf. Zn (kg)</TableHead>
                <TableHead className="text-right">Ác. Bórico (kg)</TableHead>
                 <TableHead className="text-right">Sulf. Cu (kg)</TableHead>
                 <TableHead className="text-right">Sulf. Mn (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.map((p) => (
                <TableRow key={p.mes}>
                  <TableCell className="font-medium">{p.mes}</TableCell>
                  <TableCell className="text-right">{fmt(p.ureiaKg)}</TableCell>
                  <TableCell className="text-right">{fmt(p.kclKg)}</TableCell>
                  <TableCell className="text-right">{fmt(p.calcinitKg)}</TableCell>
                  <TableCell className="text-right">{fmt(p.sulfatoMgKg)}</TableCell>
                  <TableCell className="text-right">{fmt(p.sulfatoZnKg)}</TableCell>
                  <TableCell className="text-right">{fmt(p.acidoBoricoKg)}</TableCell>
                   <TableCell className="text-right">{fmt(p.sulfatoCuKg)}</TableCell>
                   <TableCell className="text-right">{fmt(p.sulfatoMnKg)}</TableCell>
                 </TableRow>
              ))}
              <TableRow className="font-bold border-t-2">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">{fmt(parcelas.reduce((s, p) => s + p.ureiaKg, 0))}</TableCell>
                <TableCell className="text-right">{fmt(parcelas.reduce((s, p) => s + p.kclKg, 0))}</TableCell>
                <TableCell className="text-right">{fmt(parcelas.reduce((s, p) => s + p.calcinitKg, 0))}</TableCell>
                <TableCell className="text-right">{fmt(parcelas.reduce((s, p) => s + p.sulfatoMgKg, 0))}</TableCell>
                <TableCell className="text-right">{fmt(parcelas.reduce((s, p) => s + p.sulfatoZnKg, 0))}</TableCell>
                <TableCell className="text-right">{fmt(parcelas.reduce((s, p) => s + p.acidoBoricoKg, 0))}</TableCell>
                 <TableCell className="text-right">{fmt(parcelas.reduce((s, p) => s + p.sulfatoCuKg, 0))}</TableCell>
                 <TableCell className="text-right">{fmt(parcelas.reduce((s, p) => s + p.sulfatoMnKg, 0))}</TableCell>
               </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator className="my-2" />

      {/* ═══ 3º PASSO: PULVERIZAÇÃO (DINÂMICO) ═══ */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent/50 flex items-center justify-center">
          <SprayCan className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">3º Passo – Pulverização Foliar</h2>
          <p className="text-sm text-muted-foreground">A cada 30 dias na fase inicial • Bomba de 20 Litros</p>
        </div>
      </div>

      {/* Calda Padrão - Dinâmica */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Calda Padrão (Base)</CardTitle>
              <CardDescription>Presente em todas as pulverizações mensais</CardDescription>
            </div>
            <ProductPicker filterTypes={SPRAY_TYPES} onSelect={addToBase} />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Dose / 20L</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {baseProducts.map(p => (
                <ProductRow key={p.id} product={p} onDoseChange={updateBaseDose} onRemove={removeBase} />
              ))}
              {baseProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-4">
                    Nenhum produto na calda base. Adicione do catálogo.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cronograma Mensal - Dinâmico */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cronograma Mensal – Produtos Adicionais</CardTitle>
          <CardDescription>Utilizar junto à calda padrão no mês correspondente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {monthlyProducts.map((entry, mesIdx) => (
            <div key={entry.mes} className="p-3 rounded-lg border border-border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{entry.mes}</Badge>
                <ProductPicker
                  filterTypes={SPRAY_TYPES}
                  onSelect={(nome, insumoId) => addToMonth(mesIdx, nome, insumoId)}
                />
              </div>
              {entry.produtos.length > 0 ? (
                <div className="space-y-1">
                  {entry.produtos.map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-sm min-w-0">
                        {p.insumoId && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">catálogo</Badge>
                        )}
                        <span className="font-medium text-foreground truncate">{p.nome}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Input
                          value={p.dose}
                          onChange={e => updateMonthDose(mesIdx, p.id, e.target.value)}
                          className="h-7 w-24 text-sm text-right"
                        />
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => removeMonthProduct(mesIdx, p.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sem produtos adicionais neste mês.</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator className="my-2" />

      {/* ═══ 4º PASSO: APLICAÇÃO VIA SOLO / DRENCH (DINÂMICO) ═══ */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent/50 flex items-center justify-center">
          <Bug className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">4º Passo – Aplicação via Solo</h2>
          <p className="text-sm text-muted-foreground">Inseticida e fungicida em intervalos críticos pós-plantio</p>
        </div>
      </div>

      <div className="space-y-4">
        {soilApps.map((app, appIdx) => (
          <Card key={appIdx} className="border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-foreground text-background">{app.momento}</Badge>
                  <Badge variant="outline">{app.descricao}</Badge>
                </div>
                <ProductPicker
                  filterTypes={DRENCH_TYPES}
                  onSelect={(nome, insumoId) => addToSoilApp(appIdx, nome, insumoId)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Dose</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {app.produtos.map(p => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      onDoseChange={(id, dose) => updateSoilDose(appIdx, id, dose)}
                      onRemove={(id) => removeSoilProduct(appIdx, id)}
                    />
                  ))}
                  {app.produtos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-4">
                        Sem produtos. Adicione do catálogo.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <Alert className="border-primary/20 bg-primary/5">
                <Droplets className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm">{app.instrucao}</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator className="my-2" />

      {/* Observações */}
      <Card className="border-yellow-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-yellow-600" />
            Observações Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {OBSERVACOES_MANEJO.map((obs, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-foreground font-semibold shrink-0">•</span>
                <span>{obs}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
