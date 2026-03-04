import { Droplets, TreePine, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { useRoutePrefix } from '@/hooks/useRoutePrefix';
import type { Talhao } from '@/hooks/useTalhoes';

interface IrrigationSetupPanelProps {
  talhoes: Talhao[];
  talhoesLoading: boolean;
  selectedTalhaoId: string;
  setSelectedTalhaoId: (id: string) => void;
  selectedTalhao: Talhao | null;
  areaTalhao: number;
  totalPlants: number;
}

export function IrrigationSetupPanel({
  talhoes,
  talhoesLoading,
  selectedTalhaoId,
  setSelectedTalhaoId,
  selectedTalhao,
  areaTalhao,
  totalPlants,
}: IrrigationSetupPanelProps) {
  const navigate = useNavigate();
  const { prefixRoute } = useRoutePrefix();

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TreePine className="w-4 h-4 text-primary" />
          Selecione o Talhão
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Os dados de irrigação serão calculados com base nas informações do talhão selecionado.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {talhoes.length > 0 ? (
          <Select value={selectedTalhaoId} onValueChange={setSelectedTalhaoId}>
            <SelectTrigger className="h-12 text-sm font-semibold">
              <SelectValue placeholder="Selecione um talhão" />
            </SelectTrigger>
            <SelectContent>
              {talhoes.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2">
                    <span>{t.name}</span>
                    <span className="text-muted-foreground">— {t.area_ha} ha</span>
                    {t.irrigated && (
                      <Badge variant="outline" className="text-[10px] h-4 ml-1">
                        <Droplets className="w-2.5 h-2.5 mr-0.5" />
                        {t.irrigation_system === 'gotejamento' ? 'Gotejamento' : t.irrigation_system === 'aspersao' ? 'Aspersão' : 'Pivô'}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
              Nenhum talhão cadastrado. <button onClick={() => navigate(prefixRoute('/talhoes'))} className="underline font-medium hover:text-primary">Cadastrar talhão</button>
            </AlertDescription>
          </Alert>
        )}

        {selectedTalhao && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide">Área</p>
                <p className="text-lg font-bold text-foreground">{areaTalhao} ha</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide">Plantas</p>
                <p className="text-lg font-bold text-foreground">{totalPlants.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide">Variedade</p>
                <p className="text-lg font-bold text-foreground">{selectedTalhao.variety || '—'}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide">Tipo</p>
                <p className="text-lg font-bold text-foreground capitalize">{selectedTalhao.coffee_type}</p>
              </div>
            </div>

            {!selectedTalhao.irrigated && (
              <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                  Este talhão <strong>não está marcado como irrigado</strong>. Você pode configurar o sistema de irrigação manualmente abaixo, ou editar o talhão para definir o sistema padrão.
                </AlertDescription>
              </Alert>
            )}

            {selectedTalhao.irrigated && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5">
                <Droplets className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs text-primary font-medium">
                  Sistema configurado: <strong>{selectedTalhao.irrigation_system === 'gotejamento' ? 'Gotejamento' : selectedTalhao.irrigation_system === 'aspersao' ? 'Aspersão' : 'Pivô Central'}</strong> — aplicado automaticamente abaixo.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
