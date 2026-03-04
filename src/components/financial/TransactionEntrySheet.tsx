import { useState, useRef } from 'react';
import { Mic, Camera, X, Loader2, Check, PenLine, TrendingUp, TrendingDown, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  CATEGORY_OPTIONS,
  REVENUE_CATEGORY_OPTIONS,
  COFFEE_PRODUCTS_CONILON,
  COFFEE_PRODUCTS_ARABICA,
  type FinancialTransaction,
} from '@/hooks/useFinancialTransactions';
import { useTalhoes, type Talhao } from '@/hooks/useTalhoes';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (tx: Omit<FinancialTransaction, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
}

type EntryMode = 'choose_type' | 'choose' | 'voice' | 'photo' | 'manual' | 'confirm';

interface ExtractedData {
  data: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  categoria: string;
  fornecedor: string;
  talhao_id: string | null;
  resumo_confirmacao: string;
}

export function TransactionEntrySheet({ open, onOpenChange, onSave }: Props) {
  const [mode, setMode] = useState<EntryMode>('choose_type');
  const [transactionType, setTransactionType] = useState<'despesa' | 'receita'>('despesa');
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [entryMethod, setEntryMethod] = useState<'manual' | 'voz' | 'foto'>('manual');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<'sacas' | 'kg' | 'arrobas'>('sacas');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { talhoes } = useTalhoes();

  const defaultData: ExtractedData = {
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    quantidade: 1,
    valor_unitario: 0,
    valor_total: 0,
    categoria: 'outros',
    fornecedor: '',
    talhao_id: null,
    resumo_confirmacao: '',
  };

  const [manualData, setManualData] = useState<ExtractedData>({ ...defaultData });

  const resetState = () => {
    setMode('choose_type');
    setTransactionType('despesa');
    setExtracted(null);
    setLoading(false);
    setIsRecording(false);
    setManualData({ ...defaultData });
    setSelectedProduct('');
    setSelectedUnit('sacas');
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  // Get coffee products based on selected talhão
  const getProductsForTalhao = (talhaoId: string | null) => {
    if (!talhaoId) {
      // Return all products combined
      return [
        ...COFFEE_PRODUCTS_CONILON.map(p => ({ ...p, group: 'Conilon' })),
        ...COFFEE_PRODUCTS_ARABICA.filter(p => !COFFEE_PRODUCTS_CONILON.find(c => c.value === p.value)).map(p => ({ ...p, group: 'Arábica' })),
      ];
    }
    const talhao = talhoes.find(t => t.id === talhaoId);
    if (!talhao) return COFFEE_PRODUCTS_CONILON;
    return talhao.coffee_type === 'conilon' ? COFFEE_PRODUCTS_CONILON : COFFEE_PRODUCTS_ARABICA;
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível acessar o microfone.', variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setLoading(true);
  };

  const processAudio = async (_blob: Blob) => {
    toast({ title: 'Use o modo de texto', description: 'Grave o que gastou no campo de descrição.' });
    setMode('manual');
    setEntryMethod('voz');
    setLoading(false);
  };

  // Photo processing
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMode('confirm');
    setEntryMethod('foto');

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const { data, error } = await supabase.functions.invoke('extract-financial', {
          body: { imageBase64: base64, method: 'foto' },
        });

        if (error) throw error;

        const result = data?.data;
        if (result?.error) {
          toast({ title: 'Erro na extração', description: result.error, variant: 'destructive' });
          setMode('manual');
          setLoading(false);
          return;
        }

        const item = Array.isArray(result) ? result[0] : result;
        setExtracted({
          data: item.data || new Date().toISOString().split('T')[0],
          descricao: item.descricao || '',
          quantidade: item.quantidade || 1,
          valor_unitario: item.valor_unitario || 0,
          valor_total: item.valor_total || 0,
          categoria: item.categoria || 'outros',
          fornecedor: item.fornecedor || '',
          talhao_id: null,
          resumo_confirmacao: item.resumo_confirmacao || `Gasto de R$ ${item.valor_total} em ${item.descricao}. Confirma?`,
        });
        setLoading(false);
      } catch (err: any) {
        toast({ title: 'Erro ao processar foto', description: err.message, variant: 'destructive' });
        setMode('manual');
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Send text description to AI
  const processTextWithAI = async (text: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-financial', {
        body: { text, method: entryMethod },
      });

      if (error) throw error;

      const result = data?.data;
      if (result?.error) {
        toast({ title: 'Erro na extração', description: result.error, variant: 'destructive' });
        setLoading(false);
        return;
      }

      const item = Array.isArray(result) ? result[0] : result;
      setExtracted({
        data: item.data || manualData.data,
        descricao: item.descricao || '',
        quantidade: item.quantidade || 1,
        valor_unitario: item.valor_unitario || 0,
        valor_total: item.valor_total || 0,
        categoria: item.categoria || 'outros',
        fornecedor: item.fornecedor || '',
        talhao_id: null,
        resumo_confirmacao: item.resumo_confirmacao || '',
      });
      setMode('confirm');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleConfirmSave = async () => {
    const data = extracted || manualData;
    await onSave({
      talhao_id: data.talhao_id || null,
      tipo: transactionType,
      valor_unitario: data.valor_unitario,
      quantidade: data.quantidade,
      valor_total: data.valor_total || data.valor_unitario * data.quantidade,
      data: data.data,
      descricao: data.descricao,
      categoria: data.categoria,
      status: 'realizado',
      metodo_entrada: entryMethod,
      insumo_id: null,
      safra: null,
      notas: selectedProduct ? `produto:${selectedProduct}|unidade:${selectedUnit}` : null,
      fornecedor: data.fornecedor || '',
    });
    handleClose();
  };

  const handleManualSave = () => {
    const total = manualData.valor_total || manualData.valor_unitario * manualData.quantidade;
    setManualData(prev => ({ ...prev, valor_total: total }));
    setExtracted({ ...manualData, valor_total: total, resumo_confirmacao: '' });
    setMode('confirm');
  };

  const coffeeProducts = getProductsForTalhao(manualData.talhao_id);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="flex items-center justify-between">
            {mode === 'choose_type' && 'Novo Lançamento'}
            {mode === 'choose' && (transactionType === 'despesa' ? '💸 Nova Despesa' : '☕ Nova Receita')}
            {mode === 'voice' && '🎤 Gravando...'}
            {mode === 'photo' && '📷 Foto da Nota'}
            {mode === 'manual' && (transactionType === 'despesa' ? '✏️ Lançamento de Despesa' : '☕ Lançamento de Venda')}
            {mode === 'confirm' && '✅ Confirmar Dados'}
          </SheetTitle>
        </SheetHeader>

        {/* Choose type: Despesa or Receita */}
        {mode === 'choose_type' && (
          <div className="space-y-3 pb-6">
            <button
              onClick={() => { setTransactionType('despesa'); setMode('choose'); }}
              className="w-full flex items-center gap-4 p-5 rounded-2xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <div className="w-14 h-14 rounded-xl bg-destructive/90 text-destructive-foreground flex items-center justify-center">
                <TrendingDown className="w-7 h-7" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground text-lg">Despesa / Custo</p>
                <p className="text-sm text-muted-foreground">Registrar gasto da safra</p>
              </div>
            </button>

            <button
              onClick={() => { setTransactionType('receita'); setEntryMethod('manual'); setMode('manual'); }}
              className="w-full flex items-center gap-4 p-5 rounded-2xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <div className="w-14 h-14 rounded-xl bg-success text-success-foreground flex items-center justify-center">
                <TrendingUp className="w-7 h-7" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground text-lg">Receita / Venda</p>
                <p className="text-sm text-muted-foreground">Registrar venda de café e subprodutos</p>
              </div>
            </button>
          </div>
        )}

        {/* Choose entry mode (for despesa) */}
        {mode === 'choose' && transactionType === 'despesa' && (
          <div className="space-y-3 pb-6">
            <button
              onClick={() => { setEntryMethod('voz'); setMode('manual'); }}
              className="w-full flex items-center gap-4 p-5 rounded-2xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <div className="w-14 h-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <Mic className="w-7 h-7" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground text-lg">Falar o Gasto</p>
                <p className="text-sm text-muted-foreground">Descreva o que comprou por texto</p>
              </div>
            </button>

            <button
              onClick={() => {
                setEntryMethod('foto');
                fileInputRef.current?.click();
              }}
              className="w-full flex items-center gap-4 p-5 rounded-2xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <div className="w-14 h-14 rounded-xl bg-success text-success-foreground flex items-center justify-center">
                <Camera className="w-7 h-7" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground text-lg">Foto da Nota</p>
                <p className="text-sm text-muted-foreground">Tire foto do recibo ou nota fiscal</p>
              </div>
            </button>

            <button
              onClick={() => { setEntryMethod('manual'); setMode('manual'); }}
              className="w-full flex items-center gap-4 p-5 rounded-2xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <div className="w-14 h-14 rounded-xl bg-warning text-warning-foreground flex items-center justify-center">
                <PenLine className="w-7 h-7" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground text-lg">Digitar Manual</p>
                <p className="text-sm text-muted-foreground">Preencha os campos manualmente</p>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoCapture}
            />
          </div>
        )}

        {/* Manual / Voice text entry */}
        {mode === 'manual' && (
          <div className="space-y-4 pb-6">
            {/* Voice/AI mode for despesa */}
            {entryMethod === 'voz' && transactionType === 'despesa' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Descreva o gasto abaixo. Ex: "Comprei 20 sacos de Ureia por 150 reais cada na AgroMais"
                </p>
                <textarea
                  className="w-full min-h-[100px] rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                  placeholder="Descreva o gasto aqui..."
                  onChange={(e) => setManualData(prev => ({ ...prev, descricao: e.target.value }))}
                />
                <Button
                  className="w-full h-14 text-lg rounded-xl"
                  onClick={() => processTextWithAI(manualData.descricao)}
                  disabled={!manualData.descricao || loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Mic className="w-5 h-5 mr-2" />}
                  Processar com IA
                </Button>
              </div>
            )}

            {/* Revenue entry form */}
            {transactionType === 'receita' && (
              <div className="space-y-4">
                {/* Talhão selector FIRST for revenue to determine coffee type */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Talhão</label>
                  <Select
                    value={manualData.talhao_id || 'none'}
                    onValueChange={(v) => {
                      setManualData(prev => ({ ...prev, talhao_id: v === 'none' ? null : v }));
                      setSelectedProduct('');
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Selecionar talhão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geral (sem talhão)</SelectItem>
                      {talhoes.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.coffee_type === 'conilon' ? 'Conilon' : 'Arábica'} · {t.area_ha} ha)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Coffee product selector */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    <Coffee className="w-4 h-4 inline mr-1" />
                    Produto
                  </label>
                  <Select
                    value={selectedProduct}
                    onValueChange={(v) => {
                      setSelectedProduct(v);
                      const product = coffeeProducts.find(p => p.value === v);
                      if (product) {
                        const isSubproduct = ['palha_melosa', 'palha', 'varredura', 'escolha'].includes(v);
                        setManualData(prev => ({
                          ...prev,
                          descricao: product.label,
                          categoria: isSubproduct ? 'venda_subproduto' : 'venda_cafe',
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Selecionar produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {coffeeProducts.map(p => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Comprador (buyer) */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Comprador</label>
                  <Input
                    className="h-12 text-base rounded-xl"
                    placeholder="Ex: Cooperativa, Exportador..."
                    value={manualData.fornecedor}
                    onChange={(e) => setManualData(prev => ({ ...prev, fornecedor: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Quantidade</label>
                    <Input
                      type="number"
                      className="h-12 text-base rounded-xl"
                      value={manualData.quantidade || ''}
                      onChange={(e) => {
                        const qty = Number(e.target.value);
                        setManualData(prev => ({
                          ...prev,
                          quantidade: qty,
                          valor_total: qty * prev.valor_unitario,
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Unidade</label>
                    <Select value={selectedUnit} onValueChange={(v: any) => setSelectedUnit(v)}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sacas">Sacas (60kg)</SelectItem>
                        <SelectItem value="kg">Kg</SelectItem>
                        <SelectItem value="arrobas">Arrobas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">R$/{selectedUnit === 'sacas' ? 'saca' : selectedUnit === 'kg' ? 'kg' : 'arroba'}</label>
                    <Input
                      type="number"
                      className="h-12 text-base rounded-xl"
                      value={manualData.valor_unitario || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setManualData(prev => ({
                          ...prev,
                          valor_unitario: val,
                          valor_total: prev.quantidade * val,
                        }));
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Valor Total (R$)</label>
                  <Input
                    type="number"
                    className="h-12 text-base rounded-xl font-bold text-lg"
                    value={manualData.valor_total || ''}
                    onChange={(e) => setManualData(prev => ({ ...prev, valor_total: Number(e.target.value) }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Data da Venda</label>
                  <Input
                    type="date"
                    className="h-12 text-base rounded-xl"
                    value={manualData.data}
                    onChange={(e) => setManualData(prev => ({ ...prev, data: e.target.value }))}
                  />
                </div>

                <Button
                  className="w-full h-14 text-lg rounded-xl bg-success hover:bg-success/90 text-success-foreground"
                  onClick={handleManualSave}
                  disabled={!selectedProduct || manualData.valor_total <= 0}
                >
                  <Check className="w-5 h-5 mr-2" />
                  Registrar Venda
                </Button>
              </div>
            )}

            {/* Manual despesa form */}
            {entryMethod !== 'voz' && transactionType === 'despesa' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Descrição</label>
                  <Input
                    className="h-12 text-base rounded-xl"
                    placeholder="Ex: Ureia, Diarista, Diesel..."
                    value={manualData.descricao}
                    onChange={(e) => setManualData(prev => ({ ...prev, descricao: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Fornecedor</label>
                  <Input
                    className="h-12 text-base rounded-xl"
                    placeholder="Ex: AgroMais, Cooperativa..."
                    value={manualData.fornecedor}
                    onChange={(e) => setManualData(prev => ({ ...prev, fornecedor: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Quantidade</label>
                    <Input
                      type="number"
                      className="h-12 text-base rounded-xl"
                      value={manualData.quantidade || ''}
                      onChange={(e) => {
                        const qty = Number(e.target.value);
                        setManualData(prev => ({
                          ...prev,
                          quantidade: qty,
                          valor_total: qty * prev.valor_unitario,
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Valor Unitário (R$)</label>
                    <Input
                      type="number"
                      className="h-12 text-base rounded-xl"
                      value={manualData.valor_unitario || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setManualData(prev => ({
                          ...prev,
                          valor_unitario: val,
                          valor_total: prev.quantidade * val,
                        }));
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Valor Total (R$)</label>
                  <Input
                    type="number"
                    className="h-12 text-base rounded-xl font-bold text-lg"
                    value={manualData.valor_total || ''}
                    onChange={(e) => setManualData(prev => ({ ...prev, valor_total: Number(e.target.value) }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Data</label>
                    <Input
                      type="date"
                      className="h-12 text-base rounded-xl"
                      value={manualData.data}
                      onChange={(e) => setManualData(prev => ({ ...prev, data: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Categoria</label>
                    <Select value={manualData.categoria} onValueChange={(v) => setManualData(prev => ({ ...prev, categoria: v }))}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Talhão selector */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Talhão (opcional)</label>
                  <Select
                    value={manualData.talhao_id || 'none'}
                    onValueChange={(v) => setManualData(prev => ({ ...prev, talhao_id: v === 'none' ? null : v }))}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Selecionar talhão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geral (sem talhão)</SelectItem>
                      {talhoes.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.coffee_type === 'conilon' ? 'Conilon' : 'Arábica'} · {t.area_ha} ha)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full h-14 text-lg rounded-xl"
                  onClick={handleManualSave}
                  disabled={!manualData.descricao || manualData.valor_total <= 0}
                >
                  <Check className="w-5 h-5 mr-2" />
                  Salvar Lançamento
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Confirm AI extraction */}
        {mode === 'confirm' && (
          <div className="space-y-4 pb-6">
            {loading ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-muted-foreground text-center">A IA está analisando...</p>
              </div>
            ) : extracted ? (
              <>
                {extracted.resumo_confirmacao && (
                  <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                    <p className="text-foreground font-medium">{extracted.resumo_confirmacao}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-secondary">
                    <span className="text-sm text-muted-foreground">Tipo</span>
                    <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${transactionType === 'receita' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                      {transactionType === 'receita' ? '☕ Receita' : '💸 Despesa'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-secondary">
                    <span className="text-sm text-muted-foreground">Descrição</span>
                    <span className="font-medium text-foreground">{extracted.descricao}</span>
                  </div>
                  {extracted.fornecedor && (
                    <div className="flex justify-between items-center p-3 rounded-xl bg-secondary">
                      <span className="text-sm text-muted-foreground">{transactionType === 'receita' ? 'Comprador' : 'Fornecedor'}</span>
                      <span className="font-medium text-foreground">{extracted.fornecedor}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center p-3 rounded-xl bg-secondary">
                    <span className="text-sm text-muted-foreground">Quantidade</span>
                    <span className="font-medium text-foreground">
                      {extracted.quantidade} {transactionType === 'receita' ? selectedUnit : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-secondary">
                    <span className="text-sm text-muted-foreground">Valor Unitário</span>
                    <span className="font-medium text-foreground">
                      R$ {extracted.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded-xl ${transactionType === 'receita' ? 'bg-success/5 border border-success/20' : 'bg-primary/5 border border-primary/20'}`}>
                    <span className={`text-sm font-medium ${transactionType === 'receita' ? 'text-success' : 'text-primary'}`}>Valor Total</span>
                    <span className={`font-bold text-lg ${transactionType === 'receita' ? 'text-success' : 'text-primary'}`}>
                      R$ {extracted.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-secondary">
                    <span className="text-sm text-muted-foreground">Categoria</span>
                    <span className="font-medium text-foreground capitalize">{extracted.categoria.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-secondary">
                    <span className="text-sm text-muted-foreground">Data</span>
                    <span className="font-medium text-foreground">{extracted.data}</span>
                  </div>

                  {/* Talhão selector in confirm mode */}
                  <div className="p-3 rounded-xl bg-secondary">
                    <label className="text-sm text-muted-foreground mb-2 block">Vincular ao talhão</label>
                    <Select
                      value={extracted.talhao_id || 'none'}
                      onValueChange={(v) => setExtracted(prev => prev ? { ...prev, talhao_id: v === 'none' ? null : v } : null)}
                    >
                      <SelectTrigger className="h-10 rounded-lg">
                        <SelectValue placeholder="Selecionar talhão" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Geral</SelectItem>
                        {talhoes.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} ({t.coffee_type === 'conilon' ? 'Conilon' : 'Arábica'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-14 text-lg rounded-xl" onClick={() => setMode('manual')}>
                    <PenLine className="w-5 h-5 mr-2" />
                    Editar
                  </Button>
                  <Button
                    className={`flex-1 h-14 text-lg rounded-xl ${transactionType === 'receita' ? 'bg-success hover:bg-success/90 text-success-foreground' : ''}`}
                    onClick={handleConfirmSave}
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Confirmar
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}