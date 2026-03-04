import { Package, Trash2, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  MACRONUTRIENTES_LABELS,
  MICRONUTRIENTES_LABELS,
  CORRECAO_LABELS,
  TIPOS_COM_PRINCIPIOS_ATIVOS,
  type InsumoFormData,
  type Macronutrientes,
  type Micronutrientes,
  type Correcao,
} from '@/types/insumo';

interface InsumoDetailDialogProps {
  insumo: InsumoFormData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function InsumoDetailDialog({
  insumo,
  open,
  onOpenChange,
  onDelete,
  onEdit,
}: InsumoDetailDialogProps) {
  if (!insumo) return null;

  const displayPrice = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const hasMacronutrientes = Object.values(insumo.macronutrientes).some(
    (v) => v > 0
  );
  const hasMicronutrientes = Object.values(insumo.micronutrientes).some(
    (v) => v > 0
  );
  const hasCorrecao = insumo.correcao && Object.values(insumo.correcao).some(
    (v) => v > 0
  );
  
  // Verificar se é produto de pulverização
  const isSprayingProduct = TIPOS_COM_PRINCIPIOS_ATIVOS.includes(
    insumo.tipoProduto as typeof TIPOS_COM_PRINCIPIOS_ATIVOS[number]
  );
  const hasPrincipiosAtivos = insumo.principiosAtivos && insumo.principiosAtivos.length > 0;

  const handleDelete = () => {
    onDelete?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          <div className="flex flex-col">
            {/* Header com foto */}
            <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
              {insumo.fotoUrl ? (
                <img
                  src={insumo.fotoUrl}
                  alt={insumo.nome}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-24 h-24 text-muted-foreground" />
              )}
              <div className="absolute top-4 right-4">
                <Badge
                  variant={insumo.status === 'ativo' ? 'default' : 'secondary'}
                  className="text-sm px-3 py-1"
                >
                  {insumo.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-6">
              {/* Título e Marca */}
              <div>
                <h2 className="text-2xl font-bold">{insumo.nome}</h2>
                <p className="text-lg text-muted-foreground">{insumo.marca}</p>
              </div>

              <Separator />

              {/* Informações Principais */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoItem label="Culturas" value={insumo.culturas?.join(', ') || '-'} />
                <InfoItem label="Tipo de Produto" value={insumo.tipoProduto} />
                <InfoItem label="Fornecedor" value={insumo.fornecedor} />
                <InfoItem
                  label="Tamanho da Unidade"
                  value={`${insumo.tamanhoUnidade} ${insumo.medida.toUpperCase()}`}
                />
                <InfoItem label="Preço" value={displayPrice(insumo.preco)} highlight />
              </div>

              {/* Princípios Ativos e Dose (para produtos de pulverização) */}
              {isSprayingProduct && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Informações de Pulverização
                    </h3>
                    
                    {/* Dose Recomendada */}
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">Dose Recomendada por Hectare</p>
                      <p className="text-lg font-medium text-primary">
                        {insumo.recomendacaoDoseHa > 0 
                          ? `${insumo.recomendacaoDoseHa} ${insumo.recomendacaoDoseUnidade}`
                          : 'Não informado'}
                      </p>
                    </div>
                    
                    {/* Princípios Ativos */}
                    {hasPrincipiosAtivos && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-3">Princípios Ativos</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {insumo.principiosAtivos.map((pa, index) => (
                            <div key={index} className="bg-muted/50 rounded-lg p-3">
                              <p className="font-medium text-sm">{pa.nome}</p>
                              <p className="text-primary text-lg font-bold">
                                {pa.concentracao} {pa.unidade}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {!hasPrincipiosAtivos && (
                      <p className="text-sm text-muted-foreground">
                        Nenhum princípio ativo cadastrado
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Composição de Correção */}
              {hasCorrecao && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Composição de Correção
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      {(
                        Object.keys(CORRECAO_LABELS) as Array<
                          keyof Correcao
                        >
                      ).map((key) => (
                        <NutrientCard
                          key={key}
                          label={CORRECAO_LABELS[key]}
                          value={insumo.correcao[key]}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Macronutrientes */}
              {hasMacronutrientes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Composição de Macronutrientes
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(
                        Object.keys(MACRONUTRIENTES_LABELS) as Array<
                          keyof Macronutrientes
                        >
                      ).map((key) => (
                        <NutrientCard
                          key={key}
                          label={MACRONUTRIENTES_LABELS[key]}
                          value={insumo.macronutrientes[key]}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Micronutrientes */}
              {hasMicronutrientes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Composição de Micronutrientes
                    </h3>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                      {(
                        Object.keys(MICRONUTRIENTES_LABELS) as Array<
                          keyof Micronutrientes
                        >
                      ).map((key) => (
                        <MicronutrientCard
                          key={key}
                          label={MICRONUTRIENTES_LABELS[key]}
                          value={insumo.micronutrientes[key]}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Observações */}
              {insumo.observacoes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Observações</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {insumo.observacoes}
                    </p>
                  </div>
                </>
              )}

              {/* Botões de Ação */}
              <Separator />
              <div className="flex justify-end gap-3">
                <Button variant="outline" className="gap-2" onClick={onEdit}>
                  <Pencil className="w-4 h-4" />
                  Editar Insumo
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2">
                      <Trash2 className="w-4 h-4" />
                      Excluir Insumo
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir o insumo "{insumo.nome}"? 
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`font-medium ${highlight ? 'text-primary text-lg' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function NutrientCard({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;

  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center">
      <p className="text-2xl font-bold text-primary">{value}%</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function MicronutrientCard({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;

  // Extrai apenas o símbolo do elemento (ex: "B (Boro)" -> "B")
  const symbol = label.split(' ')[0];

  return (
    <div className="bg-muted/50 rounded-lg p-2 text-center" title={label}>
      <p className="text-lg font-bold text-primary">{value}%</p>
      <p className="text-xs text-muted-foreground">{symbol}</p>
    </div>
  );
}
