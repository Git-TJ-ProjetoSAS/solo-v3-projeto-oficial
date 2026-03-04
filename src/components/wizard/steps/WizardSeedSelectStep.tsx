import { useState } from 'react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWizard } from '@/contexts/WizardContext';
import { useFarmData } from '@/hooks/useFarmData';
import type { Seed } from '@/types/farm';

const PRODUCTIVITY_RANGES = [
  { value: 'baixa', label: 'Baixa (< 6t/ha)' },
  { value: 'media', label: 'Média (6-10t/ha)' },
  { value: 'alta', label: 'Alta (10-14t/ha)' },
  { value: 'muito_alta', label: 'Muito Alta (> 14t/ha)' },
] as const;

export function WizardSeedSelectStep() {
  const { wizardData, setSeedData } = useWizard();
  const { seeds, addSeed, deleteSeed } = useFarmData();

  const [showForm, setShowForm] = useState(false);
  const [selectedSeedId, setSelectedSeedId] = useState<string>(wizardData.seed?.seed?.id || '');
  
  const [seedForm, setSeedForm] = useState({
    name: '',
    company: '',
    productivityRange: 'media' as 'baixa' | 'media' | 'alta' | 'muito_alta',
    bagWeight: '',
    seedsPerBag: '',
    price: '',
  });

  const handleSeedFormChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeedForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleAddSeed = () => {
    if (!seedForm.name || !seedForm.company) return;

    const newSeed = addSeed({
      name: seedForm.name,
      company: seedForm.company,
      productivityRange: seedForm.productivityRange,
      bagWeight: parseFloat(seedForm.bagWeight) || 0,
      seedsPerBag: parseInt(seedForm.seedsPerBag) || 0,
      price: parseFloat(seedForm.price) || 0,
    });

    handleSelectSeed(newSeed);
    setSeedForm({ name: '', company: '', productivityRange: 'media', bagWeight: '', seedsPerBag: '', price: '' });
    setShowForm(false);
  };

  const handleSelectSeed = (seed: Seed) => {
    setSelectedSeedId(seed.id);
    setSeedData({
      seed,
      rowSpacing: wizardData.seed?.rowSpacing || 0,
      seedsPerMeter: wizardData.seed?.seedsPerMeter || 0,
      populationPerHectare: wizardData.seed?.populationPerHectare || 0,
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Escolha a Semente
        </h2>
        <p className="text-sm text-muted-foreground">
          Selecione ou cadastre uma nova semente
        </p>
      </div>

      {/* Add New Button */}
      {!showForm && (
        <Button 
          variant="outline" 
          onClick={() => setShowForm(true)} 
          className="w-full gap-2"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Nova Semente
        </Button>
      )}

      {/* Add Form */}
      {showForm && (
        <div className="p-5 bg-secondary rounded-xl space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Nome da Semente</Label>
              <Input placeholder="Ex: AG 1051" value={seedForm.name} onChange={handleSeedFormChange('name')} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Empresa</Label>
              <Input placeholder="Ex: Agroceres" value={seedForm.company} onChange={handleSeedFormChange('company')} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Faixa Produtiva</Label>
              <Select value={seedForm.productivityRange} onValueChange={(v) => setSeedForm(prev => ({ ...prev, productivityRange: v as typeof seedForm.productivityRange }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCTIVITY_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Preço (R$)</Label>
              <Input type="number" placeholder="350.00" value={seedForm.price} onChange={handleSeedFormChange('price')} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAddSeed} disabled={!seedForm.name || !seedForm.company}>Adicionar</Button>
          </div>
        </div>
      )}

      {/* Seeds List */}
      {seeds.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma semente cadastrada
        </div>
      ) : (
        <div className="space-y-2">
          {seeds.map(seed => (
            <button
              key={seed.id}
              onClick={() => handleSelectSeed(seed)}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                selectedSeedId === seed.id
                  ? 'bg-foreground text-background'
                  : 'bg-secondary hover:bg-accent'
              }`}
            >
              <div className="text-left">
                <p className="font-medium">{seed.name}</p>
                <p className={`text-sm ${selectedSeedId === seed.id ? 'text-background/70' : 'text-muted-foreground'}`}>
                  {seed.company} • R$ {seed.price.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedSeedId === seed.id && <CheckCircle2 className="w-5 h-5" />}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSeed(seed.id); if (selectedSeedId === seed.id) setSelectedSeedId(''); }}
                  className={`p-1.5 rounded-md transition-colors ${selectedSeedId === seed.id ? 'hover:bg-background/20' : 'hover:bg-destructive/10'}`}
                >
                  <Trash2 className={`w-4 h-4 ${selectedSeedId === seed.id ? '' : 'text-muted-foreground hover:text-destructive'}`} />
                </button>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
