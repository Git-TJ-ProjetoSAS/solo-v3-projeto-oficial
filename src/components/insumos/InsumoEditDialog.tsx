import { useState, useEffect } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
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

const MATERIA_ORGANICA_LABELS: Record<keyof MateriaOrganicaNutrientes, string> = {
  n: 'N (Nitrogênio)',
  k2o: 'K₂O (Potássio)',
  carbonoOrganicoTotal: 'Carbono Orgânico Total',
  acidoHumico: 'Ácido Húmico',
  acidoFulvico: 'Ácido Fúlvico',
  materiaOrganica: 'Matéria Orgânica',
  aminoacidos: 'Aminoácidos',
};

interface InsumoEditDialogProps {
  insumo: InsumoFormData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: InsumoFormData) => void;
}

export function InsumoEditDialog({
  insumo,
  open,
  onOpenChange,
  onSave,
}: InsumoEditDialogProps) {
  const [formData, setFormData] = useState<InsumoFormData | null>(null);

  useEffect(() => {
    if (insumo) {
      setFormData({ ...insumo });
    }
  }, [insumo]);

  if (!formData) return null;

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

  const updateMacronutriente = (key: keyof Macronutrientes, value: number) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            macronutrientes: { ...prev.macronutrientes, [key]: value },
          }
        : null
    );
  };

  const updateMicronutriente = (key: keyof Micronutrientes, value: number) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            micronutrientes: { ...prev.micronutrientes, [key]: value },
          }
        : null
    );
  };

  const updateCorrecao = (key: keyof Correcao, value: number) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            correcao: { ...prev.correcao, [key]: value },
          }
        : null
    );
  };

  const updateMateriaOrganica = (key: keyof MateriaOrganicaNutrientes, value: number) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            materiaOrganicaNutrientes: { ...prev.materiaOrganicaNutrientes, [key]: value },
          }
        : null
    );
  };

  // Verificar se é produto de pulverização
  const isMateriaOrganica = formData?.tipoProduto === 'Matéria Orgânica';
  const isSprayingProduct = formData && TIPOS_COM_PRINCIPIOS_ATIVOS.includes(
    formData.tipoProduto as typeof TIPOS_COM_PRINCIPIOS_ATIVOS[number]
  );

  // Funções para gerenciar princípios ativos
  const addPrincipioAtivo = () => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            principiosAtivos: [
              ...prev.principiosAtivos,
              { nome: '', concentracao: 0, unidade: 'g/L' }
            ],
          }
        : null
    );
  };

  const updatePrincipioAtivo = (index: number, field: keyof PrincipioAtivo, value: string | number) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            principiosAtivos: prev.principiosAtivos.map((pa, i) =>
              i === index ? { ...pa, [field]: value } : pa
            ),
          }
        : null
    );
  };

  const removePrincipioAtivo = (index: number) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            principiosAtivos: prev.principiosAtivos.filter((_, i) => i !== index),
          }
        : null
    );
  };

  const handleSave = () => {
    if (formData) {
      onSave(formData);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Editar Insumo</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Editando: {formData.nome}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] px-6 pb-6">
          <div className="space-y-6 pt-4">
            {/* Tamanho da Unidade */}
            <div className="space-y-4">
              {/* Sacaria */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Sacaria</Label>
                <div className="grid grid-cols-3 gap-3">
                  {TAMANHOS_SACARIA.map((tamanho) => (
                    <Button
                      key={`sacaria-${tamanho}`}
                      type="button"
                      variant={
                        formData.tamanhoUnidade === tamanho && formData.medida === 'kg'
                          ? 'default'
                          : 'outline'
                      }
                      className="h-14 flex-col gap-1"
                      onClick={() =>
                        setFormData((prev) =>
                          prev ? { ...prev, tamanhoUnidade: tamanho, medida: 'kg' } : null
                        )
                      }
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
                <div className="grid grid-cols-3 gap-3">
                  {TAMANHOS_LITROS.map((tamanho) => (
                    <Button
                      key={`litro-${tamanho}`}
                      type="button"
                      variant={
                        formData.tamanhoUnidade === tamanho && formData.medida === 'litro'
                          ? 'default'
                          : 'outline'
                      }
                      className="h-14 flex-col gap-1"
                      onClick={() =>
                        setFormData((prev) =>
                          prev ? { ...prev, tamanhoUnidade: tamanho, medida: 'litro' } : null
                        )
                      }
                    >
                      <span className="text-lg font-semibold">{tamanho}</span>
                      <span className="text-xs text-muted-foreground">L</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Preço */}
            <div className="space-y-3">
              <Label htmlFor="preco-edit" className="text-base font-semibold">
                Preço (R$)
              </Label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="preco-edit"
                  type="text"
                  placeholder="0,00"
                  value={displayPrice(formData.preco)}
                  onChange={(e) =>
                    setFormData((prev) =>
                      prev ? { ...prev, preco: formatPrice(e.target.value) } : null
                    )
                  }
                  className="h-12 pl-10 text-right text-lg font-semibold"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Preço por {formData.tamanhoUnidade} {formData.medida.toUpperCase()}
              </p>
            </div>

            <Separator />

            {/* Seção para Matéria Orgânica */}
            {isMateriaOrganica ? (
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Composição da Matéria Orgânica (%)
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(Object.keys(MATERIA_ORGANICA_LABELS) as Array<keyof MateriaOrganicaNutrientes>).map(
                    (key) => (
                      <div key={key} className="space-y-1">
                        <Label
                          htmlFor={`mo-edit-${key}`}
                          className="text-sm text-muted-foreground"
                        >
                          {MATERIA_ORGANICA_LABELS[key]}
                        </Label>
                        <div className="relative">
                          <Input
                            id={`mo-edit-${key}`}
                            type="text"
                            placeholder="0"
                            value={formData.materiaOrganicaNutrientes?.[key] || ''}
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
                    )
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Composição de Correção */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    Composição de Correção (%)
                  </Label>
                  <div className="grid grid-cols-3 gap-4">
                    {(Object.keys(CORRECAO_LABELS) as Array<keyof Correcao>).map(
                      (key) => (
                        <div key={key} className="space-y-1">
                          <Label
                            htmlFor={`correcao-edit-${key}`}
                            className="text-sm text-muted-foreground"
                          >
                            {CORRECAO_LABELS[key]}
                          </Label>
                          <div className="relative">
                            <Input
                              id={`correcao-edit-${key}`}
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
                      )
                    )}
                  </div>
                </div>

                <Separator />

                {/* Macronutrientes */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    Composição de Macronutrientes (%)
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(Object.keys(MACRONUTRIENTES_LABELS) as Array<keyof Macronutrientes>).map(
                      (key) => (
                        <div key={key} className="space-y-1">
                          <Label
                            htmlFor={`macro-edit-${key}`}
                            className="text-sm text-muted-foreground"
                          >
                            {MACRONUTRIENTES_LABELS[key]}
                          </Label>
                          <div className="relative">
                            <Input
                              id={`macro-edit-${key}`}
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
                      )
                    )}
                  </div>
                </div>

                <Separator />

                {/* Micronutrientes */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    Composição de Micronutrientes (%)
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(Object.keys(MICRONUTRIENTES_LABELS) as Array<keyof Micronutrientes>).map(
                      (key) => (
                        <div key={key} className="space-y-1">
                          <Label
                            htmlFor={`micro-edit-${key}`}
                            className="text-sm text-muted-foreground"
                          >
                            {MICRONUTRIENTES_LABELS[key]}
                          </Label>
                          <div className="relative">
                            <Input
                              id={`micro-edit-${key}`}
                              type="text"
                              placeholder="0"
                              value={formData.micronutrientes[key] || ''}
                              onChange={(e) =>
                                updateMicronutriente(key, parsePercentage(e.target.value))
                              }
                              className="h-10 pr-8"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                              %
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Seção para produtos de pulverização */}
            {isSprayingProduct && (
              <>
                <Separator />
                
                {/* Dose Recomendada */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    Dose Recomendada por Hectare
                  </Label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 2.5"
                        value={formData.recomendacaoDoseHa || ''}
                        onChange={(e) =>
                          setFormData((prev) =>
                            prev ? { ...prev, recomendacaoDoseHa: parseFloat(e.target.value) || 0 } : null
                          )
                        }
                        className="h-10"
                      />
                    </div>
                    <select
                      value={formData.recomendacaoDoseUnidade}
                      onChange={(e) =>
                        setFormData((prev) =>
                          prev ? { ...prev, recomendacaoDoseUnidade: e.target.value } : null
                        )
                      }
                      className="h-10 px-3 rounded-md border border-input bg-background"
                    >
                      {UNIDADES_DOSE.map((unidade) => (
                        <option key={unidade} value={unidade}>{unidade}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Separator />

                {/* Princípios Ativos */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Princípios Ativos</Label>
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
                    <p className="text-sm text-muted-foreground">
                      Nenhum princípio ativo cadastrado
                    </p>
                  ) : (
                    <div className="space-y-2">
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
                  )}
                </div>
              </>
            )}

            {/* Botão Salvar */}
            <div className="pt-4">
              <Button onClick={handleSave} className="w-full gap-2" size="lg">
                <Save className="w-4 h-4" />
                Salvar Alterações
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
