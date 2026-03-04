import { useState, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check, Package, Upload, X, ImageIcon, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { findDuplicateInsumos, type FuzzyMatch } from '@/lib/fuzzyInsumoMatch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  CULTURAS,
  TAMANHOS_SACARIA,
  TAMANHOS_LITROS,
  MACRONUTRIENTES_LABELS,
  MICRONUTRIENTES_LABELS,
  CORRECAO_LABELS,
  TIPOS_COM_PRINCIPIOS_ATIVOS,
  UNIDADES_DOSE,
  type InsumoFormData,
  type Macronutrientes,
  type Micronutrientes,
  type Correcao,
  type PrincipioAtivo,
  type MateriaOrganicaNutrientes,
} from '@/types/insumo';

interface InsumoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: InsumoFormData) => void;
  onSuccess?: () => void;
  tipoProduto: string;
  existingInsumos?: Array<{ id: string; nome: string }>;
  editingId?: string;
}

// Etapas base
const BASE_STEPS = [
  { id: 1, title: 'Cultura' },
  { id: 2, title: 'Nome' },
  { id: 3, title: 'Marca' },
  { id: 4, title: 'Fornecedor' },
  { id: 5, title: 'Status' },
  { id: 6, title: 'Embalagem' },
  { id: 7, title: 'Preço' },
];

// Etapas para produtos de pulverização (Fungicida, Inseticida, Herbicida, Adjuvantes)
const SPRAYING_STEPS = [
  { id: 8, title: 'Princípios Ativos' },
  { id: 9, title: 'Dose Recomendada' },
  { id: 10, title: 'Observações' },
  { id: 11, title: 'Foto' },
  { id: 12, title: 'Revisão' },
];

// Etapas para Foliar (inclui nutrientes + princípios ativos + dose)
const FOLIAR_STEPS = [
  { id: 8, title: 'Macronutrientes' },
  { id: 9, title: 'Micronutrientes' },
  { id: 10, title: 'Propriedades Físicas' },
  { id: 11, title: 'Princípios Ativos' },
  { id: 12, title: 'Dose Recomendada' },
  { id: 13, title: 'Observações' },
  { id: 14, title: 'Foto' },
  { id: 15, title: 'Revisão' },
];

// Etapas para outros produtos (Correção de Solo, Plantio, Cobertura)
const NUTRITION_STEPS = [
  { id: 8, title: 'Correção' },
  { id: 9, title: 'Macronutrientes' },
  { id: 10, title: 'Micronutrientes' },
  { id: 11, title: 'Observações' },
  { id: 12, title: 'Foto' },
  { id: 13, title: 'Revisão' },
];

// Etapas para Matéria Orgânica
const MATERIA_ORGANICA_STEPS = [
  { id: 8, title: 'Composição Orgânica' },
  { id: 9, title: 'Dose Recomendada' },
  { id: 10, title: 'Observações' },
  { id: 11, title: 'Foto' },
  { id: 12, title: 'Revisão' },
];

const MATERIA_ORGANICA_LABELS: Record<keyof MateriaOrganicaNutrientes, string> = {
  n: 'N (Nitrogênio)',
  k2o: 'K₂O (Potássio)',
  carbonoOrganicoTotal: 'Carbono Orgânico Total',
  acidoHumico: 'Ácido Húmico',
  acidoFulvico: 'Ácido Fúlvico',
  materiaOrganica: 'Matéria Orgânica',
  aminoacidos: 'Aminoácidos',
};

const initialMacronutrientes: Macronutrientes = {
  n: 0,
  p2o5: 0,
  k2o: 0,
  ca: 0,
  s: 0,
};

const initialMicronutrientes: Micronutrientes = {
  b: 0,
  zn: 0,
  cu: 0,
  mn: 0,
  fe: 0,
  mo: 0,
  co: 0,
  se: 0,
  mg: 0,
  carbonoOrganico: 0,
};

const initialCorrecao: Correcao = {
  caco3: 0,
  camg: 0,
  prnt: 0,
};

const initialMateriaOrganicaNutrientes: MateriaOrganicaNutrientes = {
  n: 0,
  k2o: 0,
  carbonoOrganicoTotal: 0,
  acidoHumico: 0,
  acidoFulvico: 0,
  materiaOrganica: 0,
  aminoacidos: 0,
};

const initialFormData: InsumoFormData = {
  culturas: [],
  tipoProduto: '',
  nome: '',
  marca: '',
  fornecedor: '',
  status: 'ativo',
  tamanhoUnidade: 25,
  medida: 'kg',
  preco: 0,
  macronutrientes: initialMacronutrientes,
  micronutrientes: initialMicronutrientes,
  correcao: initialCorrecao,
  principiosAtivos: [],
  recomendacaoDoseHa: 0,
  recomendacaoDoseUnidade: 'L/ha',
  solubilidade: 0,
  indiceSalino: 0,
  materiaOrganicaNutrientes: initialMateriaOrganicaNutrientes,
  observacoes: '',
  fotoUrl: null,
};

export function InsumoFormDialog({
  open,
  onOpenChange,
  onSubmit,
  onSuccess,
  tipoProduto,
  existingInsumos = [],
  editingId,
}: InsumoFormDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<InsumoFormData>({
    ...initialFormData,
    tipoProduto,
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [microUnit, setMicroUnit] = useState<'%' | 'ppm'>('%');
  const [duplicateWarningDismissed, setDuplicateWarningDismissed] = useState(false);

  // Fuzzy duplicate detection
  const duplicateMatches = useMemo(() => {
    if (!formData.nome.trim() || formData.nome.length < 3) return [];
    return findDuplicateInsumos(formData.nome, existingInsumos, editingId);
  }, [formData.nome, existingInsumos, editingId]);
  // Determinar tipo de fluxo do produto
  const isFoliarProduct = tipoProduto === 'Foliar';
  const isMateriaOrganica = tipoProduto === 'Matéria Orgânica';
  const isSprayingProduct = !isFoliarProduct && !isMateriaOrganica && TIPOS_COM_PRINCIPIOS_ATIVOS.includes(
    tipoProduto as typeof TIPOS_COM_PRINCIPIOS_ATIVOS[number]
  );

  // Selecionar as etapas baseado no tipo de produto
  const STEPS = isMateriaOrganica
    ? [...BASE_STEPS, ...MATERIA_ORGANICA_STEPS]
    : isFoliarProduct
      ? [...BASE_STEPS, ...FOLIAR_STEPS]
      : isSprayingProduct
        ? [...BASE_STEPS, ...SPRAYING_STEPS]
        : [...BASE_STEPS, ...NUTRITION_STEPS];

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(formData);
    }
    if (onSuccess) {
      onSuccess();
    }
    handleReset();
  };

  const handleReset = () => {
    setCurrentStep(1);
    setFormData({ ...initialFormData, tipoProduto });
    setPreviewImage(null);
    setDuplicateWarningDismissed(false);
    onOpenChange(false);
  };

  const updateFormData = <K extends keyof InsumoFormData>(
    key: K,
    value: InsumoFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const updateMacronutriente = (key: keyof Macronutrientes, value: number) => {
    setFormData((prev) => ({
      ...prev,
      macronutrientes: { ...prev.macronutrientes, [key]: value },
    }));
  };

  const updateMateriaOrganica = (key: keyof MateriaOrganicaNutrientes, value: number) => {
    setFormData((prev) => ({
      ...prev,
      materiaOrganicaNutrientes: { ...prev.materiaOrganicaNutrientes, [key]: value },
    }));
  };

  const updateMicronutriente = (key: keyof Micronutrientes, value: number) => {
    setFormData((prev) => ({
      ...prev,
      micronutrientes: { ...prev.micronutrientes, [key]: value },
    }));
  };

  const updateCorrecao = (key: keyof Correcao, value: number) => {
    setFormData((prev) => ({
      ...prev,
      correcao: { ...prev.correcao, [key]: value },
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreviewImage(base64);
        updateFormData('fotoUrl', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setPreviewImage(null);
    updateFormData('fotoUrl', null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatPrice = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const numberValue = parseInt(numericValue || '0', 10) / 100;
    return numberValue;
  };

  const displayPrice = (value: number) => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parsePercentage = (value: string): number => {
    const cleaned = value.replace(',', '.').replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));
  };

  // Obter título da etapa atual
  const currentStepTitle = STEPS[currentStep - 1]?.title || '';

  const isStepValid = () => {
    switch (currentStepTitle) {
      case 'Cultura':
        return formData.culturas.length > 0;
      case 'Nome':
        return formData.nome.trim() !== '';
      case 'Marca':
        return formData.marca.trim() !== '';
      case 'Fornecedor':
        return formData.fornecedor.trim() !== '';
      case 'Status':
        return formData.status !== undefined;
      case 'Embalagem':
        return formData.tamanhoUnidade > 0 && formData.medida !== undefined;
      case 'Preço':
        return formData.preco >= 0;
      case 'Composição Orgânica':
        return true; // Composição orgânica é opcional
      case 'Correção':
        return true; // Correção é opcional
      case 'Macronutrientes':
        return true; // Macronutrientes são opcionais
      case 'Micronutrientes':
        return true; // Micronutrientes são opcionais
      case 'Princípios Ativos':
        return true; // Princípios ativos são opcionais
      case 'Dose Recomendada':
        return true;
      case 'Propriedades Físicas':
        return true;
      case 'Observações':
        return true; // Observações são opcionais
      case 'Foto':
        return true; // Foto é opcional
      case 'Revisão':
        return true; // Revisão sempre válida
      default:
        return true;
    }
  };

  // Funções para gerenciar princípios ativos
  const addPrincipioAtivo = () => {
    setFormData((prev) => ({
      ...prev,
      principiosAtivos: [
        ...prev.principiosAtivos,
        { nome: '', concentracao: 0, unidade: 'g/L' }
      ],
    }));
  };

  const updatePrincipioAtivo = (index: number, field: keyof PrincipioAtivo, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      principiosAtivos: prev.principiosAtivos.map((pa, i) =>
        i === index ? { ...pa, [field]: value } : pa
      ),
    }));
  };

  const removePrincipioAtivo = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      principiosAtivos: prev.principiosAtivos.filter((_, i) => i !== index),
    }));
  };

  const renderStepContent = () => {
    switch (currentStepTitle) {
      case 'Cultura':
        return (
          <div className="space-y-4">
            <Label className="text-base">Selecione as Culturas</Label>
            <p className="text-sm text-muted-foreground">Marque todas as culturas que utilizam este insumo</p>
            <div className="grid grid-cols-2 gap-3">
              {CULTURAS.map((cultura) => {
                const isSelected = formData.culturas.includes(cultura);
                return (
                  <Button
                    key={cultura}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    className="h-12 justify-start gap-2"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        culturas: isSelected
                          ? prev.culturas.filter((c) => c !== cultura)
                          : [...prev.culturas, cultura],
                      }));
                    }}
                  >
                    {isSelected && <Check className="w-4 h-4" />}
                    {cultura}
                  </Button>
                );
              })}
            </div>
          </div>
        );

      case 'Nome':
        return (
          <div className="space-y-4">
            <Label htmlFor="nome" className="text-base">
              Nome do Insumo ou Fórmula
            </Label>
            <Input
              id="nome"
              placeholder="Ex: Roundup Original, Glifosato 480"
              value={formData.nome}
              onChange={(e) => {
                updateFormData('nome', e.target.value);
                setDuplicateWarningDismissed(false);
              }}
              className="h-12"
            />
            {duplicateMatches.length > 0 && !duplicateWarningDismissed && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-medium text-destructive">
                      Possível duplicação detectada
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Já existem insumos com nomes semelhantes cadastrados:
                    </p>
                    <ul className="space-y-1 mt-1">
                      {duplicateMatches.slice(0, 3).map((match) => (
                        <li key={match.id} className="text-sm flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                            {Math.round(match.score * 100)}%
                          </Badge>
                          <span className="font-medium">{match.name}</span>
                          <span className="text-xs text-muted-foreground">— {match.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => setDuplicateWarningDismissed(true)}
                >
                  Não é duplicado, continuar mesmo assim
                </Button>
              </div>
            )}
          </div>
        );

      case 'Marca':
        return (
          <div className="space-y-4">
            <Label htmlFor="marca" className="text-base">
              Marca ou Fabricante
            </Label>
            <Input
              id="marca"
              placeholder="Ex: Yara, Bayer, Syngenta"
              value={formData.marca}
              onChange={(e) => updateFormData('marca', e.target.value)}
              className="h-12"
            />
          </div>
        );

      case 'Fornecedor':
        return (
          <div className="space-y-4">
            <Label htmlFor="fornecedor" className="text-base">
              Local ou Fornecedor
            </Label>
            <Input
              id="fornecedor"
              placeholder="Ex: Agropecuária XYZ"
              value={formData.fornecedor}
              onChange={(e) => updateFormData('fornecedor', e.target.value)}
              className="h-12"
            />
          </div>
        );

      case 'Status':
        return (
          <div className="space-y-4">
            <Label className="text-base">Status do Insumo</Label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant={formData.status === 'ativo' ? 'default' : 'outline'}
                className="h-16 flex-col gap-1"
                onClick={() => updateFormData('status', 'ativo')}
              >
                <Check className="w-5 h-5" />
                Ativo
              </Button>
              <Button
                type="button"
                variant={formData.status === 'inativo' ? 'default' : 'outline'}
                className="h-16 flex-col gap-1"
                onClick={() => updateFormData('status', 'inativo')}
              >
                <Package className="w-5 h-5" />
                Inativo
              </Button>
            </div>
          </div>
        );

      case 'Embalagem':
        return (
          <div className="space-y-6">
            {/* Sacaria */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Sacaria</Label>
              <div className="grid grid-cols-3 gap-4">
                {TAMANHOS_SACARIA.map((tamanho) => (
                  <Button
                    key={`sacaria-${tamanho}`}
                    type="button"
                    variant={
                      formData.tamanhoUnidade === tamanho && formData.medida === 'kg'
                        ? 'default'
                        : 'outline'
                    }
                    className="h-16 flex-col gap-1"
                    onClick={() => {
                      updateFormData('tamanhoUnidade', tamanho);
                      updateFormData('medida', 'kg');
                    }}
                  >
                    <span className="text-lg font-semibold">{tamanho}</span>
                    <span className="text-xs text-muted-foreground">kg</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Litros */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Litros</Label>
              <div className="grid grid-cols-3 gap-4">
                {TAMANHOS_LITROS.map((tamanho) => (
                  <Button
                    key={`litro-${tamanho}`}
                    type="button"
                    variant={
                      formData.tamanhoUnidade === tamanho && formData.medida === 'litro'
                        ? 'default'
                        : 'outline'
                    }
                    className="h-16 flex-col gap-1"
                    onClick={() => {
                      updateFormData('tamanhoUnidade', tamanho);
                      updateFormData('medida', 'litro');
                    }}
                  >
                    <span className="text-lg font-semibold">{tamanho}</span>
                    <span className="text-xs text-muted-foreground">L</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'Preço':
        return (
          <div className="space-y-4">
            <Label htmlFor="preco" className="text-base">
              Preço (R$)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                id="preco"
                type="text"
                placeholder="0,00"
                value={displayPrice(formData.preco)}
                onChange={(e) =>
                  updateFormData('preco', formatPrice(e.target.value))
                }
                className="h-12 pl-10 text-right text-lg font-semibold"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Preço por {formData.tamanhoUnidade} {formData.medida === 'kg' ? 'KG' : 'L'}
            </p>
          </div>
        );

      case 'Princípios Ativos':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Princípios Ativos</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPrincipioAtivo}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>
            
            {formData.principiosAtivos.length === 0 ? (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum princípio ativo adicionado.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Clique em "Adicionar" para incluir princípios ativos do produto.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {formData.principiosAtivos.map((pa, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Nome do princípio ativo"
                          value={pa.nome}
                          onChange={(e) => updatePrincipioAtivo(index, 'nome', e.target.value)}
                          className="h-9"
                        />
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Concentração"
                            value={pa.concentracao || ''}
                            onChange={(e) => updatePrincipioAtivo(index, 'concentracao', parseFloat(e.target.value) || 0)}
                            className="h-9 flex-1"
                          />
                          <select
                            value={pa.unidade}
                            onChange={(e) => updatePrincipioAtivo(index, 'unidade', e.target.value)}
                            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                          >
                            <option value="g/L">g/L</option>
                            <option value="g/kg">g/kg</option>
                            <option value="%">%</option>
                            <option value="mg/L">mg/L</option>
                          </select>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePrincipioAtivo(index)}
                        className="h-9 w-9 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        );

      case 'Dose Recomendada':
        return (
          <div className="space-y-4">
            <Label className="text-base">Dose Recomendada por Hectare</Label>
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="dose" className="text-sm text-muted-foreground">
                  Quantidade
                </Label>
                <Input
                  id="dose"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 2.5"
                  value={formData.recomendacaoDoseHa || ''}
                  onChange={(e) => updateFormData('recomendacaoDoseHa', parseFloat(e.target.value) || 0)}
                  className="h-12"
                />
              </div>
              <div className="w-32 space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Unidade
                </Label>
                <select
                  value={formData.recomendacaoDoseUnidade}
                  onChange={(e) => updateFormData('recomendacaoDoseUnidade', e.target.value)}
                  className="h-12 w-full px-3 rounded-md border border-input bg-background"
                >
                  {UNIDADES_DOSE.map((unidade) => (
                    <option key={unidade} value={unidade}>{unidade}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Informe a dose recomendada pelo fabricante para aplicação por hectare.
            </p>
          </div>
        );

      case 'Correção':
        return (
          <div className="space-y-4">
            <Label className="text-base">Composição de Correção (%)</Label>
            <div className="grid grid-cols-3 gap-4">
              {(Object.keys(CORRECAO_LABELS) as Array<keyof Correcao>).map((key) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={`correcao-${key}`} className="text-sm text-muted-foreground">
                    {CORRECAO_LABELS[key]}
                  </Label>
                  <div className="relative">
                    <Input
                      id={`correcao-${key}`}
                      type="text"
                      placeholder="0"
                      value={formData.correcao?.[key] || ''}
                      onChange={(e) =>
                        updateCorrecao(key, parsePercentage(e.target.value))
                      }
                      className="h-10 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      %
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'Macronutrientes':
        return (
          <div className="space-y-4">
            <Label className="text-base">Composição de Macronutrientes (%)</Label>
            <div className="grid grid-cols-2 gap-4">
              {(Object.keys(MACRONUTRIENTES_LABELS) as Array<keyof Macronutrientes>).map((key) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={`macro-${key}`} className="text-sm text-muted-foreground">
                    {MACRONUTRIENTES_LABELS[key]}
                  </Label>
                  <div className="relative">
                    <Input
                      id={`macro-${key}`}
                      type="text"
                      placeholder="0"
                      value={formData.macronutrientes[key] || ''}
                      onChange={(e) =>
                        updateMacronutriente(key, parsePercentage(e.target.value))
                      }
                      className="h-10 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      %
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'Micronutrientes':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Composição de Micronutrientes</Label>
              <div className="flex items-center gap-1 rounded-lg border border-input p-0.5">
                <button
                  type="button"
                  className={cn(
                    "px-3 py-1 text-xs rounded-md font-medium transition-colors",
                    microUnit === '%' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setMicroUnit('%')}
                >
                  %
                </button>
                <button
                  type="button"
                  className={cn(
                    "px-3 py-1 text-xs rounded-md font-medium transition-colors",
                    microUnit === 'ppm' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setMicroUnit('ppm')}
                >
                  ppm
                </button>
              </div>
            </div>
            {microUnit === 'ppm' && (
              <p className="text-xs text-muted-foreground">
                Valores em ppm serão convertidos para % automaticamente (÷ 10.000)
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(MICRONUTRIENTES_LABELS) as Array<keyof Micronutrientes>).map((key) => {
                const storedValue = formData.micronutrientes[key] || 0;
                const displayValue = microUnit === 'ppm' ? storedValue * 10000 : storedValue;
                return (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={`micro-${key}`} className="text-sm text-muted-foreground">
                      {MICRONUTRIENTES_LABELS[key]}
                    </Label>
                    <div className="relative">
                      <Input
                        id={`micro-${key}`}
                        type="text"
                        placeholder="0"
                        value={displayValue || ''}
                        onChange={(e) => {
                          const raw = e.target.value.replace(',', '.').replace(/[^\d.]/g, '');
                          const parsed = parseFloat(raw);
                          if (isNaN(parsed)) {
                            updateMicronutriente(key, 0);
                          } else if (microUnit === 'ppm') {
                            updateMicronutriente(key, Math.max(0, parsed / 10000));
                          } else {
                            updateMicronutriente(key, Math.min(100, Math.max(0, parsed)));
                          }
                        }}
                        className="h-10 pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        {microUnit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'Propriedades Físicas':
        return (
          <div className="space-y-4">
            <Label className="text-base">Propriedades Físico-Químicas</Label>
            <p className="text-sm text-muted-foreground">Dados técnicos do rótulo do adubo foliar</p>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="solubilidade" className="text-sm text-muted-foreground">
                  Solubilidade (g/L em H₂O a 20 °C)
                </Label>
                <div className="relative">
                  <Input
                    id="solubilidade"
                    type="text"
                    placeholder="0"
                    value={formData.solubilidade || ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.').replace(/[^\d.]/g, '');
                      const parsed = parseFloat(raw);
                      updateFormData('solubilidade', isNaN(parsed) ? 0 : Math.max(0, parsed));
                    }}
                    className="h-10 pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    g/L
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="indiceSalino" className="text-sm text-muted-foreground">
                  Índice Salino
                </Label>
                <Input
                  id="indiceSalino"
                  type="text"
                  placeholder="0"
                  value={formData.indiceSalino || ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(',', '.').replace(/[^\d.]/g, '');
                    const parsed = parseFloat(raw);
                    updateFormData('indiceSalino', isNaN(parsed) ? 0 : Math.max(0, parsed));
                  }}
                  className="h-10"
                />
              </div>
            </div>
          </div>
        );

      case 'Composição Orgânica':
        return (
          <div className="space-y-4">
            <Label className="text-base">Composição da Matéria Orgânica (%)</Label>
            <p className="text-sm text-muted-foreground">Informe os valores conforme o rótulo do produto</p>
            <div className="grid grid-cols-2 gap-4">
              {(Object.keys(MATERIA_ORGANICA_LABELS) as Array<keyof MateriaOrganicaNutrientes>).map((key) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={`mo-${key}`} className="text-sm text-muted-foreground">
                    {MATERIA_ORGANICA_LABELS[key]}
                  </Label>
                  <div className="relative">
                    <Input
                      id={`mo-${key}`}
                      type="text"
                      placeholder="0"
                      value={formData.materiaOrganicaNutrientes[key] || ''}
                      onChange={(e) =>
                        updateMateriaOrganica(key, parsePercentage(e.target.value))
                      }
                      className="h-10 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      %
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'Observações':
        return (
          <div className="space-y-4">
            <Label htmlFor="observacoes" className="text-base">
              Observações
            </Label>
            <Textarea
              id="observacoes"
              placeholder="Adicione informações adicionais sobre o insumo..."
              value={formData.observacoes}
              onChange={(e) => updateFormData('observacoes', e.target.value)}
              className="min-h-[150px] resize-none"
            />
          </div>
        );

      case 'Foto':
        return (
          <div className="space-y-4">
            <Label className="text-base">Foto do Produto ou Rótulo</Label>
            
            {previewImage ? (
              <div className="relative">
                <img
                  src={previewImage}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Clique para enviar uma foto
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG ou WEBP (máx. 5MB)
                </p>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        );

      case 'Revisão':
        return (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              <Label className="text-base">Revisão do Cadastro</Label>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Culturas</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {formData.culturas.map((c) => (
                      <Badge key={c} variant="secondary">{c}</Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Tipo</span>
                  <Badge variant="secondary">{formData.tipoProduto}</Badge>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Nome</span>
                  <span className="font-medium">{formData.nome}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Marca</span>
                  <span className="font-medium">{formData.marca}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Fornecedor</span>
                  <span className="font-medium">{formData.fornecedor}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={formData.status === 'ativo' ? 'default' : 'secondary'}>
                    {formData.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Unidade</span>
                  <span className="font-medium">
                    {formData.tamanhoUnidade} {formData.medida.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Preço</span>
                  <span className="font-medium text-primary">
                    R$ {displayPrice(formData.preco)}
                  </span>
                </div>

                {/* Para produtos de pulverização, mostrar princípios ativos e dose */}
                {isSprayingProduct && (
                  <>
                    <div className="py-2 border-b">
                      <span className="text-sm text-muted-foreground block mb-2">Princípios Ativos</span>
                      <div className="flex flex-wrap gap-2">
                        {formData.principiosAtivos.length > 0 ? (
                          formData.principiosAtivos.map((pa, i) => (
                            <Badge key={i} variant="outline">
                              {pa.nome}: {pa.concentracao} {pa.unidade}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Não informado</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Dose Recomendada</span>
                      <span className="font-medium">
                        {formData.recomendacaoDoseHa > 0 
                          ? `${formData.recomendacaoDoseHa} ${formData.recomendacaoDoseUnidade}`
                          : 'Não informado'}
                      </span>
                    </div>
                  </>
                )}

                {/* Para Matéria Orgânica, mostrar composição orgânica */}
                {isMateriaOrganica && (
                  <div className="py-2 border-b">
                    <span className="text-sm text-muted-foreground block mb-2">Composição Orgânica</span>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(MATERIA_ORGANICA_LABELS) as Array<keyof MateriaOrganicaNutrientes>).map((key) => (
                        formData.materiaOrganicaNutrientes[key] > 0 && (
                          <Badge key={key} variant="outline">
                            {MATERIA_ORGANICA_LABELS[key]}: {formData.materiaOrganicaNutrientes[key]}%
                          </Badge>
                        )
                      ))}
                      {Object.values(formData.materiaOrganicaNutrientes).every(v => v === 0) && (
                        <span className="text-sm text-muted-foreground">Não informado</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Para produtos de nutrição ou Foliar, mostrar composições */}
                {(!isSprayingProduct && !isMateriaOrganica || isFoliarProduct) && (
                  <>
                    {!isFoliarProduct && (
                      <div className="py-2 border-b">
                        <span className="text-sm text-muted-foreground block mb-2">Composição de Correção</span>
                        <div className="flex flex-wrap gap-2">
                          {(Object.keys(CORRECAO_LABELS) as Array<keyof Correcao>).map((key) => (
                            formData.correcao?.[key] > 0 && (
                              <Badge key={key} variant="outline">
                                {key.toUpperCase()}: {formData.correcao?.[key]}%
                              </Badge>
                            )
                          ))}
                          {(!formData.correcao || Object.values(formData.correcao).every(v => v === 0)) && (
                            <span className="text-sm text-muted-foreground">Não informado</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="py-2 border-b">
                      <span className="text-sm text-muted-foreground block mb-2">Macronutrientes</span>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(MACRONUTRIENTES_LABELS) as Array<keyof Macronutrientes>).map((key) => (
                          formData.macronutrientes[key] > 0 && (
                            <Badge key={key} variant="outline">
                              {key.toUpperCase()}: {formData.macronutrientes[key]}%
                            </Badge>
                          )
                        ))}
                        {Object.values(formData.macronutrientes).every(v => v === 0) && (
                          <span className="text-sm text-muted-foreground">Não informado</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="py-2 border-b">
                      <span className="text-sm text-muted-foreground block mb-2">Micronutrientes</span>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(MICRONUTRIENTES_LABELS) as Array<keyof Micronutrientes>).map((key) => (
                          formData.micronutrientes[key] > 0 && (
                            <Badge key={key} variant="outline">
                              {key.toUpperCase()}: {formData.micronutrientes[key]}%
                            </Badge>
                          )
                        ))}
                        {Object.values(formData.micronutrientes).every(v => v === 0) && (
                          <span className="text-sm text-muted-foreground">Não informado</span>
                        )}
                      </div>
                    </div>

                    {isFoliarProduct && (
                      <>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-muted-foreground">Solubilidade</span>
                          <span className="font-medium">
                            {formData.solubilidade > 0 ? `${formData.solubilidade} g/L` : 'Não informado'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-muted-foreground">Índice Salino</span>
                          <span className="font-medium">
                            {formData.indiceSalino > 0 ? formData.indiceSalino : 'Não informado'}
                          </span>
                        </div>
                      </>
                    )}
                  </>
                )}
                
                {formData.observacoes && (
                  <div className="py-2 border-b">
                    <span className="text-sm text-muted-foreground block mb-1">Observações</span>
                    <p className="text-sm">{formData.observacoes}</p>
                  </div>
                )}
                
                {previewImage && (
                  <div className="py-2">
                    <span className="text-sm text-muted-foreground block mb-2">Foto</span>
                    <img
                      src={previewImage}
                      alt="Produto"
                      className="w-20 h-20 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleReset}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Cadastrar Novo Insumo
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-0.5 py-2">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={cn(
                'h-1.5 w-4 rounded-full transition-colors',
                currentStep >= step.id ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        {/* Step title */}
        <div className="text-center">
          <span className="text-sm text-muted-foreground">
            Etapa {currentStep} de {STEPS.length}
          </span>
          <h3 className="font-medium">{STEPS[currentStep - 1].title}</h3>
        </div>

        {/* Step content */}
        <div className="min-h-[200px] py-4">{renderStepContent()}</div>

        {/* Navigation buttons */}
        <div className="flex justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!isStepValid()}
              className="flex-1"
            >
              Avançar
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!isStepValid()}
              className="flex-1"
            >
              <Check className="w-4 h-4 mr-1" />
              Cadastrar Agora
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
