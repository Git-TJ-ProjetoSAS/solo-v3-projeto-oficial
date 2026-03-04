import { useState } from 'react';
import { Talhao } from '@/hooks/useTalhoes';
import { useSatelliteImagery, SatelliteImage } from '@/hooks/useSatelliteImagery';
import { Loader2, Satellite, Calendar, Cloud, Sun, Eye, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type ImageType = 'ndvi' | 'evi' | 'truecolor' | 'falsecolor';

const IMAGE_LABELS: Record<ImageType, { label: string; description: string }> = {
  ndvi: { label: 'NDVI', description: 'Índice de Vegetação por Diferença Normalizada' },
  evi: { label: 'EVI', description: 'Índice de Vegetação Melhorado' },
  truecolor: { label: 'Cor Real', description: 'Imagem em cores naturais' },
  falsecolor: { label: 'Falsa Cor', description: 'Infravermelho próximo' },
};

interface TalhaoSatelliteViewProps {
  talhao: Talhao | null;
}

export function TalhaoSatelliteView({ talhao }: TalhaoSatelliteViewProps) {
  const { images, loading, registering } = useSatelliteImagery(talhao);
  const [selectedImageType, setSelectedImageType] = useState<ImageType>('ndvi');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!talhao) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Satellite className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Selecione um Talhão</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Selecione um talhão com polígono desenhado para ver imagens de satélite.
        </p>
      </div>
    );
  }

  if (!talhao.geojson) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Satellite className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Polígono Necessário</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Desenhe o polígono do talhão "{talhao.name}" no mapa para acessar imagens de satélite.
        </p>
      </div>
    );
  }

  if (registering) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Registrando polígono no serviço de satélite...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Carregando imagens de satélite...</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Cloud className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Sem Imagens Disponíveis</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Não há imagens de satélite disponíveis para este talhão nos últimos 90 dias.
        </p>
      </div>
    );
  }

  const currentImage = images[selectedImageIndex];
  const imageUrl = currentImage?.image?.[selectedImageType] || '';
  const cloudCoverage = currentImage?.cl ?? 0;
  const imageDate = currentImage ? new Date(currentImage.dt * 1000) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Satellite className="w-5 h-5 text-primary" />
            Satélite — {talhao.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {images.length} imagens nos últimos 90 dias
          </p>
        </div>
        <Badge variant="outline" className="text-xs gap-1">
          <Layers className="w-3 h-3" />
          Sentinel-2
        </Badge>
      </div>

      {/* Image type selector */}
      <Tabs value={selectedImageType} onValueChange={(v) => setSelectedImageType(v as ImageType)}>
        <TabsList className="w-full">
          {Object.entries(IMAGE_LABELS).map(([key, val]) => (
            <TabsTrigger key={key} value={key} className="flex-1 text-xs">
              {val.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-1">
          <p className="text-[10px] text-muted-foreground">
            {IMAGE_LABELS[selectedImageType].description}
          </p>
        </div>
      </Tabs>

      {/* Date selector */}
      <div className="flex items-center gap-3">
        <Select
          value={String(selectedImageIndex)}
          onValueChange={(v) => setSelectedImageIndex(Number(v))}
        >
          <SelectTrigger className="flex-1 h-9 text-xs">
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {images.map((img, i) => {
              const date = new Date(img.dt * 1000);
              return (
                <SelectItem key={i} value={String(i)} className="text-xs">
                  {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {' — '}
                  <span className={cn(
                    img.cl < 20 ? 'text-emerald-600' : img.cl < 50 ? 'text-amber-600' : 'text-red-600'
                  )}>
                    ☁ {Math.round(img.cl)}%
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Navigation arrows */}
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            disabled={selectedImageIndex >= images.length - 1}
            onClick={() => setSelectedImageIndex(prev => Math.min(images.length - 1, prev + 1))}
          >
            ◀
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            disabled={selectedImageIndex <= 0}
            onClick={() => setSelectedImageIndex(prev => Math.max(0, prev - 1))}
          >
            ▶
          </Button>
        </div>
      </div>

      {/* Image display */}
      <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-black">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${IMAGE_LABELS[selectedImageType].label} - ${talhao.name}`}
            className="w-full h-auto min-h-[300px] object-contain"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p className="text-sm">Imagem não disponível para este tipo</p>
          </div>
        )}

        {/* Overlay info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">
                  {imageDate?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5" />
                <span className="text-xs">{Math.round(cloudCoverage)}% nuvens</span>
              </div>
              {currentImage?.sun && (
                <div className="flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5" />
                  <span className="text-xs">{Math.round(currentImage.sun.elevation)}° elevação</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NDVI color scale legend */}
      {(selectedImageType === 'ndvi' || selectedImageType === 'evi') && (
        <div className="rounded-xl border border-border/50 p-3 bg-card">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
            Escala {selectedImageType.toUpperCase()}
          </p>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">-1</span>
            <div className="flex-1 h-3 rounded-full overflow-hidden flex">
              <div className="flex-1 bg-red-700" />
              <div className="flex-1 bg-red-500" />
              <div className="flex-1 bg-orange-400" />
              <div className="flex-1 bg-yellow-400" />
              <div className="flex-1 bg-yellow-300" />
              <div className="flex-1 bg-lime-400" />
              <div className="flex-1 bg-green-500" />
              <div className="flex-1 bg-green-700" />
              <div className="flex-1 bg-green-900" />
            </div>
            <span className="text-[10px] text-muted-foreground">+1</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">Solo / Água</span>
            <span className="text-[10px] text-muted-foreground">Vegetação saudável</span>
          </div>
        </div>
      )}

      {/* Timeline thumbnails */}
      {images.length > 1 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Linha do Tempo</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.slice(0, 12).map((img, i) => {
              const thumbUrl = img.image?.[selectedImageType] || img.image?.truecolor;
              const date = new Date(img.dt * 1000);
              return (
                <button
                  key={i}
                  onClick={() => setSelectedImageIndex(i)}
                  className={cn(
                    'shrink-0 rounded-lg overflow-hidden border-2 transition-all',
                    i === selectedImageIndex
                      ? 'border-primary shadow-md'
                      : 'border-border/50 opacity-70 hover:opacity-100'
                  )}
                >
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt=""
                      className="w-16 h-16 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted flex items-center justify-center">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <p className="text-[9px] text-center py-0.5 bg-background text-muted-foreground">
                    {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
