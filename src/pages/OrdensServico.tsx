import { useState } from 'react';
import { useOrdensServico, type OSWithReceitas, type ReceitaInput } from '@/hooks/useOrdensServico';
import { useTalhoes } from '@/hooks/useTalhoes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Cloud, CloudSun, Play, CheckCircle2, XCircle, Trash2,
  Beaker, Clock, MapPin, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  bloqueada_clima: { label: 'Bloqueada (Clima)', color: 'bg-warning/20 text-warning border-warning/30', icon: Cloud },
  liberada: { label: 'Liberada', color: 'bg-success/20 text-success border-success/30', icon: CloudSun },
  em_execucao: { label: 'Em Execução', color: 'bg-primary/20 text-primary border-primary/30', icon: Play },
  concluida: { label: 'Concluída', color: 'bg-muted text-muted-foreground border-border', icon: CheckCircle2 },
  cancelada: { label: 'Cancelada', color: 'bg-destructive/20 text-destructive border-destructive/30', icon: XCircle },
};

const TIPO_LABELS: Record<string, string> = {
  solo: 'Adubação de Solo',
  foliar_casada: 'Foliar Casada',
  correcao: 'Correção',
};

const isBiologicalOS = (os: OSWithReceitas) => {
  return os.tipo_operacao === 'solo' && os.notas?.startsWith('Receita Biológica');
};

export default function OrdensServico() {
  const { ordens, loading, createOS, transitionStatus, deleteOS } = useOrdensServico();
  const { talhoes } = useTalhoes();
  const [showCreate, setShowCreate] = useState(false);
  const [showChecklist, setShowChecklist] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [checkingClimate, setCheckingClimate] = useState(false);

  // Create form state
  const [formTalhao, setFormTalhao] = useState('');
  const [formTipo, setFormTipo] = useState<'solo' | 'foliar_casada' | 'correcao'>('solo');
  const [formVolume, setFormVolume] = useState('300');
  const [formArea, setFormArea] = useState('');
  const [formData, setFormData] = useState('');
  const [formNotas, setFormNotas] = useState('');
  const [formReceitas, setFormReceitas] = useState<ReceitaInput[]>([
    { insumo_nome: '', dose_hectare: 0, unidade: 'L/ha' },
  ]);

  // Checklist state
  const [checklist, setChecklist] = useState({
    epi_completo: false,
    equipamento_calibrado: false,
    mistura_testada: false,
    area_sinalizada: false,
  });

  const handleCreate = async () => {
    if (!formTalhao) { toast.error('Selecione um talhão'); return; }
    const validReceitas = formReceitas.filter(r => r.insumo_nome.trim());
    if (validReceitas.length === 0) { toast.error('Adicione pelo menos um insumo'); return; }

    await createOS({
      talhao_id: formTalhao,
      tipo_operacao: formTipo,
      volume_calda_hectare: parseFloat(formVolume) || 300,
      area_aplicacao_ha: parseFloat(formArea) || 0,
      data_prevista: formData || null,
      notas: formNotas || null,
    }, validReceitas);

    setShowCreate(false);
    resetForm();
  };

  const resetForm = () => {
    setFormTalhao('');
    setFormTipo('solo');
    setFormVolume('300');
    setFormArea('');
    setFormData('');
    setFormNotas('');
    setFormReceitas([{ insumo_nome: '', dose_hectare: 0, unidade: 'L/ha' }]);
  };

  const handleStartExecution = async (osId: string) => {
    const allChecked = Object.values(checklist).every(Boolean);
    if (!allChecked) { toast.error('Complete todos os itens do checklist'); return; }
    const ok = await transitionStatus(osId, 'em_execucao', checklist);
    if (ok) {
      setShowChecklist(null);
      setChecklist({ epi_completo: false, equipamento_calibrado: false, mistura_testada: false, area_sinalizada: false });
    }
  };

  const handleForceClimateCheck = async () => {
    setCheckingClimate(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-climate-os');
      if (error) throw error;
      toast.success(data?.message || 'Verificação concluída');
    } catch (e: any) {
      toast.error('Erro na verificação climática');
      console.error(e);
    }
    setCheckingClimate(false);
  };

  const addReceita = () => {
    setFormReceitas(prev => [...prev, { insumo_nome: '', dose_hectare: 0, unidade: 'L/ha' }]);
  };

  const updateReceita = (index: number, field: keyof ReceitaInput, value: any) => {
    setFormReceitas(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const removeReceita = (index: number) => {
    if (formReceitas.length <= 1) return;
    setFormReceitas(prev => prev.filter((_, i) => i !== index));
  };

  const grouped = {
    pendentes: ordens.filter(o => o.status === 'bloqueada_clima' || o.status === 'liberada'),
    execucao: ordens.filter(o => o.status === 'em_execucao'),
    finalizadas: ordens.filter(o => o.status === 'concluida' || o.status === 'cancelada'),
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Ordens de Serviço</h1>
          <p className="text-sm text-muted-foreground">{ordens.length} ordens cadastradas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleForceClimateCheck} disabled={checkingClimate}>
            <Cloud className="w-4 h-4 mr-1" />
            {checkingClimate ? 'Verificando...' : 'Checar Clima'}
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> Nova OS
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : ordens.length === 0 ? (
        <Card className="p-8 text-center">
          <Beaker className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma ordem de serviço cadastrada</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> Criar primeira OS
          </Button>
        </Card>
      ) : (
        <>
          {/* Pendentes */}
          {grouped.pendentes.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Pendentes ({grouped.pendentes.length})
              </h2>
              <div className="space-y-3">
                {grouped.pendentes.map(os => (
                  <OSCard
                    key={os.id}
                    os={os}
                    expanded={expandedId === os.id}
                    onToggle={() => setExpandedId(expandedId === os.id ? null : os.id)}
                    onStartExecution={() => setShowChecklist(os.id)}
                    onCancel={() => transitionStatus(os.id, 'cancelada')}
                    onDelete={() => deleteOS(os.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Em Execução */}
          {grouped.execucao.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Em Execução ({grouped.execucao.length})
              </h2>
              <div className="space-y-3">
                {grouped.execucao.map(os => (
                  <OSCard
                    key={os.id}
                    os={os}
                    expanded={expandedId === os.id}
                    onToggle={() => setExpandedId(expandedId === os.id ? null : os.id)}
                    onComplete={() => transitionStatus(os.id, 'concluida')}
                    onCancel={() => transitionStatus(os.id, 'cancelada')}
                    onDelete={() => deleteOS(os.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Finalizadas */}
          {grouped.finalizadas.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Finalizadas ({grouped.finalizadas.length})
              </h2>
              <div className="space-y-3">
                {grouped.finalizadas.map(os => (
                  <OSCard
                    key={os.id}
                    os={os}
                    expanded={expandedId === os.id}
                    onToggle={() => setExpandedId(expandedId === os.id ? null : os.id)}
                    onDelete={() => deleteOS(os.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Ordem de Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Talhão *</Label>
              <Select value={formTalhao} onValueChange={(v) => {
                setFormTalhao(v);
                const t = talhoes.find(t => t.id === v);
                if (t) setFormArea(String(t.area_ha));
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {talhoes.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.area_ha} ha)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Operação</Label>
                <Select value={formTipo} onValueChange={(v: any) => setFormTipo(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solo">Adubação de Solo</SelectItem>
                    <SelectItem value="foliar_casada">Foliar Casada</SelectItem>
                    <SelectItem value="correcao">Correção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Volume Calda (L/ha)</Label>
                <Input type="number" value={formVolume} onChange={e => setFormVolume(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Área (ha)</Label>
                <Input type="number" value={formArea} onChange={e => setFormArea(e.target.value)} />
              </div>
              <div>
                <Label>Data Prevista</Label>
                <Input type="date" value={formData} onChange={e => setFormData(e.target.value)} />
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Receita do Tanque</Label>
                <Button size="sm" variant="outline" onClick={addReceita}>
                  <Plus className="w-3 h-3 mr-1" /> Insumo
                </Button>
              </div>
              <div className="space-y-3">
                {formReceitas.map((r, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1">
                      {i === 0 && <Label className="text-xs">Nome do Insumo</Label>}
                      <Input
                        placeholder="Ex: Fungicida X"
                        value={r.insumo_nome}
                        onChange={e => updateReceita(i, 'insumo_nome', e.target.value)}
                      />
                    </div>
                    <div className="w-24">
                      {i === 0 && <Label className="text-xs">Dose</Label>}
                      <Input
                        type="number"
                        placeholder="0"
                        value={r.dose_hectare || ''}
                        onChange={e => updateReceita(i, 'dose_hectare', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-20">
                      {i === 0 && <Label className="text-xs">Unidade</Label>}
                      <Select value={r.unidade || 'L/ha'} onValueChange={v => updateReceita(i, 'unidade', v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="L/ha">L/ha</SelectItem>
                          <SelectItem value="kg/ha">kg/ha</SelectItem>
                          <SelectItem value="g/ha">g/ha</SelectItem>
                          <SelectItem value="mL/ha">mL/ha</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formReceitas.length > 1 && (
                      <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => removeReceita(i)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea value={formNotas} onChange={e => setFormNotas(e.target.value)} placeholder="Observações..." />
            </div>

            <Button className="w-full" onClick={handleCreate}>Criar Ordem de Serviço</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checklist Dialog */}
      <Dialog open={!!showChecklist} onOpenChange={() => setShowChecklist(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Checklist de Segurança
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Confirme todos os itens antes de iniciar a execução:
          </p>
          <div className="space-y-4">
            {[
              { key: 'epi_completo', label: 'EPI completo (luvas, máscara, óculos, macacão)' },
              { key: 'equipamento_calibrado', label: 'Equipamento calibrado e revisado' },
              { key: 'mistura_testada', label: 'Mistura de tanque testada (teste de jarra)' },
              { key: 'area_sinalizada', label: 'Área de aplicação sinalizada' },
            ].map(item => (
              <div key={item.key} className="flex items-center gap-3">
                <Checkbox
                  checked={checklist[item.key as keyof typeof checklist]}
                  onCheckedChange={(checked) => setChecklist(prev => ({ ...prev, [item.key]: !!checked }))}
                />
                <label className="text-sm">{item.label}</label>
              </div>
            ))}
          </div>
          <Button
            className="w-full mt-4"
            onClick={() => showChecklist && handleStartExecution(showChecklist)}
            disabled={!Object.values(checklist).every(Boolean)}
          >
            <Play className="w-4 h-4 mr-1" /> Iniciar Execução
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- OS Card Component ----
function OSCard({ os, expanded, onToggle, onStartExecution, onComplete, onCancel, onDelete }: {
  os: OSWithReceitas;
  expanded: boolean;
  onToggle: () => void;
  onStartExecution?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
}) {
  const config = STATUS_CONFIG[os.status] || STATUS_CONFIG.bloqueada_clima;
  const StatusIcon = config.icon;

  const isBio = isBiologicalOS(os);

  return (
    <Card className={`overflow-hidden ${isBio ? 'border-l-4 border-l-emerald-500 dark:border-l-emerald-400' : ''}`}>
      <button onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className={`text-xs ${config.color}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
              {isBio ? (
                <Badge className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20">
                  🧬 Biológico
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  {TIPO_LABELS[os.tipo_operacao] || os.tipo_operacao}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-foreground font-medium">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              {os.talhao_name}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {os.area_aplicacao_ha > 0 && <span>{os.area_aplicacao_ha} ha</span>}
              {os.volume_calda_hectare > 0 && <span>{os.volume_calda_hectare} L/ha</span>}
              {os.receitas.length > 0 && <span>{os.receitas.length} insumo(s)</span>}
              {os.data_prevista && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(os.data_prevista), "dd/MM", { locale: ptBR })}
                </span>
              )}
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <Separator />

          {/* Receitas */}
          {os.receitas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Receita do Tanque</p>
              <div className="space-y-1">
                 {os.receitas.map((r, i) => (
                   <div key={r.id} className={`flex justify-between text-sm rounded-lg px-3 py-2 ${
                     r.notas?.startsWith('Biológico') ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-secondary/50'
                   }`}>
                     <span className="text-foreground">
                       {i + 1}. {r.insumo_nome}
                       {r.notas?.startsWith('Biológico') && <span className="ml-1 text-xs text-emerald-600 dark:text-emerald-400">🧬</span>}
                     </span>
                     <span className="text-muted-foreground font-mono">{r.dose_hectare} {r.unidade}</span>
                   </div>
                ))}
              </div>
            </div>
          )}

          {/* Climate Snapshot */}
          {os.clima_snapshot && (
            <div className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-2">
              <span className="font-semibold">Dados climáticos: </span>
              {JSON.stringify(os.clima_snapshot, null, 0).slice(0, 200)}
            </div>
          )}

          {/* Execution info */}
          {os.tempo_execucao_min && (
            <div className="text-xs text-muted-foreground">
              Tempo de execução: {Math.round(os.tempo_execucao_min)} min
            </div>
          )}

          {os.notas && (
            <p className="text-xs text-muted-foreground italic">{os.notas}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {os.status === 'liberada' && onStartExecution && (
              <Button size="sm" onClick={onStartExecution}>
                <Play className="w-3.5 h-3.5 mr-1" /> Iniciar
              </Button>
            )}
            {os.status === 'em_execucao' && onComplete && (
              <Button size="sm" onClick={onComplete}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Concluir
              </Button>
            )}
            {(os.status !== 'concluida' && os.status !== 'cancelada') && onCancel && (
              <Button size="sm" variant="outline" onClick={onCancel}>
                <XCircle className="w-3.5 h-3.5 mr-1" /> Cancelar
              </Button>
            )}
            {onDelete && (
              <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={onDelete}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
