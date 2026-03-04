import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Compatibility = 'compativel' | 'incompativel' | 'condicional';

interface CompatibilityEntry {
  biologico: string;
  tipoBio: string;
  quimico: string;
  grupoQuimico: string;
  tipoProduto: string;
  status: Compatibility;
  observacao: string;
}

export const COMPATIBILITY_DATA: CompatibilityEntry[] = [
  // Beauveria bassiana
  { biologico: 'Beauveria bassiana', tipoBio: 'Fungo entomopatogênico', quimico: 'Cobre (oxicloreto)', grupoQuimico: 'Inorgânico cúprico', tipoProduto: 'Fungicida', status: 'incompativel', observacao: 'Cobre é letal para conídios de Beauveria. Intervalo mínimo de 10 dias.' },
  { biologico: 'Beauveria bassiana', tipoBio: 'Fungo entomopatogênico', quimico: 'Mancozeb', grupoQuimico: 'Ditiocarbamato', tipoProduto: 'Fungicida', status: 'incompativel', observacao: 'Mancozeb elimina a viabilidade dos conídios por ação fungicida direta.' },
  { biologico: 'Beauveria bassiana', tipoBio: 'Fungo entomopatogênico', quimico: 'Triazóis (Tebuconazol)', grupoQuimico: 'Triazol', tipoProduto: 'Fungicida', status: 'incompativel', observacao: 'Triazóis inibem a germinação dos conídios. Não misturar.' },
  { biologico: 'Beauveria bassiana', tipoBio: 'Fungo entomopatogênico', quimico: 'Óleo mineral', grupoQuimico: 'Adjuvante', tipoProduto: 'Adjuvante', status: 'condicional', observacao: 'Concentrações acima de 0,5% podem reduzir viabilidade. Usar com cautela.' },
  { biologico: 'Beauveria bassiana', tipoBio: 'Fungo entomopatogênico', quimico: 'Imidacloprido', grupoQuimico: 'Neonicotinóide', tipoProduto: 'Inseticida', status: 'condicional', observacao: 'Compatível em doses baixas. Em doses altas, pode afetar a germinação.' },
  { biologico: 'Beauveria bassiana', tipoBio: 'Fungo entomopatogênico', quimico: 'Azadiractina (Neem)', grupoQuimico: 'Botânico', tipoProduto: 'Inseticida', status: 'compativel', observacao: 'Sem efeito adverso sobre conídios. Ação sinérgica comprovada.' },
  { biologico: 'Beauveria bassiana', tipoBio: 'Fungo entomopatogênico', quimico: 'Clorantraniliprole', grupoQuimico: 'Diamida', tipoProduto: 'Inseticida', status: 'compativel', observacao: 'Sem interferência na germinação. Pode ser associado.' },

  // Metarhizium anisopliae
  { biologico: 'Metarhizium anisopliae', tipoBio: 'Fungo entomopatogênico', quimico: 'Cobre (oxicloreto)', grupoQuimico: 'Inorgânico cúprico', tipoProduto: 'Fungicida', status: 'incompativel', observacao: 'Cúpricos eliminam conídios de Metarhizium. Intervalo mínimo de 7 dias.' },
  { biologico: 'Metarhizium anisopliae', tipoBio: 'Fungo entomopatogênico', quimico: 'Carbendazim', grupoQuimico: 'Benzimidazol', tipoProduto: 'Fungicida', status: 'incompativel', observacao: 'Benzimidazóis são letais para Metarhizium em qualquer dose.' },
  { biologico: 'Metarhizium anisopliae', tipoBio: 'Fungo entomopatogênico', quimico: 'Azadiractina (Neem)', grupoQuimico: 'Botânico', tipoProduto: 'Inseticida', status: 'compativel', observacao: 'Compatibilidade confirmada. Efeito complementar no manejo.' },
  { biologico: 'Metarhizium anisopliae', tipoBio: 'Fungo entomopatogênico', quimico: 'Lambda-cialotrina', grupoQuimico: 'Piretróide', tipoProduto: 'Inseticida', status: 'condicional', observacao: 'Compatível em doses reduzidas. Doses altas afetam a viabilidade.' },

  // Bacillus thuringiensis
  { biologico: 'Bacillus thuringiensis', tipoBio: 'Bactéria entomopatogênica', quimico: 'Cobre (oxicloreto)', grupoQuimico: 'Inorgânico cúprico', tipoProduto: 'Fungicida', status: 'condicional', observacao: 'Bt é mais tolerante a cúpricos que fungos, mas evitar concentrações altas.' },
  { biologico: 'Bacillus thuringiensis', tipoBio: 'Bactéria entomopatogênica', quimico: 'Mancozeb', grupoQuimico: 'Ditiocarbamato', tipoProduto: 'Fungicida', status: 'compativel', observacao: 'Mancozeb não afeta esporos de Bt. Podem ser misturados.' },
  { biologico: 'Bacillus thuringiensis', tipoBio: 'Bactéria entomopatogênica', quimico: 'Clorantraniliprole', grupoQuimico: 'Diamida', tipoProduto: 'Inseticida', status: 'compativel', observacao: 'Sinergia comprovada. Uso conjunto recomendado em MIP.' },
  { biologico: 'Bacillus thuringiensis', tipoBio: 'Bactéria entomopatogênica', quimico: 'Imidacloprido', grupoQuimico: 'Neonicotinóide', tipoProduto: 'Inseticida', status: 'compativel', observacao: 'Compatíveis. Diferentes modos de ação, sem interferência.' },

  // Trichoderma harzianum
  { biologico: 'Trichoderma harzianum', tipoBio: 'Fungo antagonista', quimico: 'Cobre (oxicloreto)', grupoQuimico: 'Inorgânico cúprico', tipoProduto: 'Fungicida', status: 'incompativel', observacao: 'Cobre inibe o crescimento micelial de Trichoderma.' },
  { biologico: 'Trichoderma harzianum', tipoBio: 'Fungo antagonista', quimico: 'Triazóis (Tebuconazol)', grupoQuimico: 'Triazol', tipoProduto: 'Fungicida', status: 'incompativel', observacao: 'Triazóis impedem a colonização por Trichoderma. Intervalo de 14 dias.' },
  { biologico: 'Trichoderma harzianum', tipoBio: 'Fungo antagonista', quimico: 'Azadiractina (Neem)', grupoQuimico: 'Botânico', tipoProduto: 'Inseticida', status: 'compativel', observacao: 'Sem efeito adverso. Podem ser aplicados conjuntamente.' },
  { biologico: 'Trichoderma harzianum', tipoBio: 'Fungo antagonista', quimico: 'Fosfito de potássio', grupoQuimico: 'Fosfito', tipoProduto: 'Indutor', status: 'compativel', observacao: 'Complementares: Trichoderma no solo + Fosfito na planta.' },
  { biologico: 'Trichoderma harzianum', tipoBio: 'Fungo antagonista', quimico: 'Glifosato', grupoQuimico: 'Glicina substituída', tipoProduto: 'Herbicida', status: 'condicional', observacao: 'Glifosato em doses de campo pode reduzir a esporulação em 30-50%.' },
];

const STATUS_CONFIG = {
  compativel: { label: 'Compatível', icon: CheckCircle2, bg: 'bg-success/5', border: 'border-success/20', text: 'text-success', badge: 'bg-success/10 text-success border-success/20' },
  incompativel: { label: 'Incompatível', icon: XCircle, bg: 'bg-destructive/5', border: 'border-destructive/20', text: 'text-destructive', badge: 'bg-destructive/10 text-destructive border-destructive/20' },
  condicional: { label: 'Condicional', icon: AlertTriangle, bg: 'bg-warning/5', border: 'border-warning/20', text: 'text-warning', badge: 'bg-warning/10 text-warning border-warning/20' },
};

const UNIQUE_BIOS = [...new Set(COMPATIBILITY_DATA.map(d => d.biologico))];
const UNIQUE_TIPOS = [...new Set(COMPATIBILITY_DATA.map(d => d.tipoProduto))];
const UNIQUE_GRUPOS = [...new Set(COMPATIBILITY_DATA.map(d => d.grupoQuimico))];

interface Props {
  onBack?: () => void;
  defaultBio?: string;
}

export default function BioCompatibilityTable({ onBack, defaultBio }: Props) {
  const [search, setSearch] = useState('');
  const initialBio = defaultBio ? UNIQUE_BIOS.find(b => b.toLowerCase().includes(defaultBio.toLowerCase())) || 'all' : 'all';
  const [filterBio, setFilterBio] = useState(initialBio);
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterGrupo, setFilterGrupo] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = COMPATIBILITY_DATA.filter((entry) => {
    if (filterBio !== 'all' && entry.biologico !== filterBio) return false;
    if (filterTipo !== 'all' && entry.tipoProduto !== filterTipo) return false;
    if (filterGrupo !== 'all' && entry.grupoQuimico !== filterGrupo) return false;
    if (filterStatus !== 'all' && entry.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        entry.biologico.toLowerCase().includes(q) ||
        entry.quimico.toLowerCase().includes(q) ||
        entry.grupoQuimico.toLowerCase().includes(q) ||
        entry.observacao.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    compativel: filtered.filter(e => e.status === 'compativel').length,
    incompativel: filtered.filter(e => e.status === 'incompativel').length,
    condicional: filtered.filter(e => e.status === 'condicional').length,
  };

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div>
          <h1 className="text-lg font-bold text-foreground">📋 Tabela de Compatibilidade</h1>
          <p className="text-xs text-muted-foreground">Biológicos × Químicos — Referência técnica para mistura de tanque</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['compativel', 'incompativel', 'condicional'] as const).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
              className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                filterStatus === s ? `${cfg.bg} ${cfg.border} ring-2 ring-offset-1 ring-offset-background ring-primary/30` : 'bg-card border-border hover:bg-muted/50'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${cfg.text}`} />
              <div>
                <p className={`text-lg font-bold ${cfg.text}`}>{counts[s]}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{cfg.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="space-y-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto, grupo químico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Filter className="w-3.5 h-3.5" />
          <span className="font-medium">Filtros:</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Select value={filterBio} onValueChange={setFilterBio}>
            <SelectTrigger className="text-xs h-9 bg-card">
              <SelectValue placeholder="Biológico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos biológicos</SelectItem>
              {UNIQUE_BIOS.map(b => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="text-xs h-9 bg-card">
              <SelectValue placeholder="Tipo produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {UNIQUE_TIPOS.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterGrupo} onValueChange={setFilterGrupo}>
            <SelectTrigger className="text-xs h-9 bg-card col-span-2 sm:col-span-1">
              <SelectValue placeholder="Grupo químico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {UNIQUE_GRUPOS.map(g => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Nenhum resultado encontrado para os filtros selecionados.
          </div>
        )}

        {filtered.map((entry, i) => {
          const cfg = STATUS_CONFIG[entry.status];
          const Icon = cfg.icon;
          return (
            <div
              key={`${entry.biologico}-${entry.quimico}-${i}`}
              className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 transition-all`}
              style={{ animation: `fade-in 0.2s ease-out ${i * 30}ms backwards` }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-foreground">{entry.biologico}</span>
                    <span className="text-muted-foreground text-xs">×</span>
                    <span className="text-sm font-medium text-foreground">{entry.quimico}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px] border-border">
                      {entry.tipoBio}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] border-border">
                      {entry.tipoProduto}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] border-border">
                      {entry.grupoQuimico}
                    </Badge>
                  </div>
                </div>
                <Badge className={`shrink-0 text-[10px] ${cfg.badge} flex items-center gap-1`}>
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                {entry.observacao}
              </p>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold text-foreground mb-2">Legenda:</p>
        <div className="space-y-1.5">
          {(['compativel', 'incompativel', 'condicional'] as const).map(s => {
            const cfg = STATUS_CONFIG[s];
            const Icon = cfg.icon;
            return (
              <div key={s} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className={`w-3.5 h-3.5 ${cfg.text}`} />
                <span className="font-medium">{cfg.label}:</span>
                <span>
                  {s === 'compativel' && 'Podem ser misturados sem risco de inativação.'}
                  {s === 'incompativel' && 'Não misturar — risco de perda total do biológico.'}
                  {s === 'condicional' && 'Compatível sob condições específicas (dose, concentração).'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
