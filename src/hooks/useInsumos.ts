import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { InsumoFormData, PrincipioAtivo, MateriaOrganicaNutrientes } from '@/types/insumo';
import type { Json } from '@/integrations/supabase/types';

// Interface interna para mapear dados do banco
interface InsumoFromDb {
  id: string;
  culturas: string[];
  tipo_produto: string;
  nome: string;
  marca: string;
  fornecedor: string;
  status: string;
  tamanho_unidade: number;
  medida: string;
  preco: number;
  macro_n: number;
  macro_p2o5: number;
  macro_k2o: number;
  macro_s: number;
  micro_b: number;
  micro_zn: number;
  micro_cu: number;
  micro_mn: number;
  micro_fe: number;
  micro_mo: number;
  micro_co: number;
  micro_se: number;
  correcao_caco3: number;
  correcao_camg: number;
  correcao_prnt: number;
  carbono_organico: number;
  principios_ativos: Json;
  recomendacao_dose_ha: number;
  recomendacao_dose_unidade: string;
  observacoes: string | null;
  foto_url: string | null;
  created_at: string;
  updated_at: string;
}

// Converter do formato do banco para o formato do formulário
function dbToFormData(db: InsumoFromDb): InsumoFormData & { id: string } {
  // Parse principios_ativos de JSON para array tipado
  const principiosAtivos: PrincipioAtivo[] = Array.isArray(db.principios_ativos)
    ? (db.principios_ativos as unknown as PrincipioAtivo[])
    : [];
  return {
    id: db.id,
    culturas: db.culturas || [],
    tipoProduto: db.tipo_produto,
    nome: db.nome,
    marca: db.marca,
    fornecedor: db.fornecedor,
    status: db.status as 'ativo' | 'inativo',
    tamanhoUnidade: db.tamanho_unidade,
    medida: db.medida as 'kg' | 'litro',
    preco: db.preco,
    macronutrientes: {
      n: db.macro_n,
      p2o5: db.macro_p2o5,
      k2o: db.macro_k2o,
      ca: (db as any).macro_ca || 0,
      s: db.macro_s,
    },
    micronutrientes: {
      b: db.micro_b,
      zn: db.micro_zn,
      cu: db.micro_cu,
      mn: db.micro_mn,
      fe: db.micro_fe,
      mo: db.micro_mo,
      co: db.micro_co,
      se: db.micro_se,
      mg: (db as any).micro_mg || 0,
      carbonoOrganico: db.carbono_organico,
    },
    correcao: {
      caco3: db.correcao_caco3,
      camg: db.correcao_camg,
      prnt: db.correcao_prnt,
    },
    materiaOrganicaNutrientes: {
      n: db.macro_n,
      k2o: db.macro_k2o,
      carbonoOrganicoTotal: db.carbono_organico,
      acidoHumico: (db as any).acido_humico || 0,
      acidoFulvico: (db as any).acido_fulvico || 0,
      materiaOrganica: (db as any).materia_organica_perc || 0,
      aminoacidos: (db as any).aminoacidos || 0,
    },
    principiosAtivos,
    recomendacaoDoseHa: db.recomendacao_dose_ha || 0,
    recomendacaoDoseUnidade: db.recomendacao_dose_unidade || 'L/ha',
    solubilidade: (db as any).solubilidade || 0,
    indiceSalino: (db as any).indice_salino || 0,
    observacoes: db.observacoes || '',
    fotoUrl: db.foto_url,
  };
}

// Converter do formato do formulário para o formato do banco
function formDataToDb(data: InsumoFormData) {
  const isMateriaOrganica = data.tipoProduto === 'Matéria Orgânica';
  return {
    culturas: data.culturas,
    tipo_produto: data.tipoProduto,
    nome: data.nome,
    marca: data.marca,
    fornecedor: data.fornecedor,
    status: data.status,
    tamanho_unidade: data.tamanhoUnidade,
    medida: data.medida,
    preco: data.preco,
    macro_n: isMateriaOrganica ? data.materiaOrganicaNutrientes.n : data.macronutrientes.n,
    macro_p2o5: data.macronutrientes.p2o5,
    macro_k2o: isMateriaOrganica ? data.materiaOrganicaNutrientes.k2o : data.macronutrientes.k2o,
    macro_ca: data.macronutrientes.ca,
    macro_s: data.macronutrientes.s,
    micro_b: data.micronutrientes.b,
    micro_zn: data.micronutrientes.zn,
    micro_cu: data.micronutrientes.cu,
    micro_mn: data.micronutrientes.mn,
    micro_fe: data.micronutrientes.fe,
    micro_mo: data.micronutrientes.mo,
    micro_co: data.micronutrientes.co,
    micro_se: data.micronutrientes.se,
    micro_mg: data.micronutrientes.mg,
    carbono_organico: isMateriaOrganica ? data.materiaOrganicaNutrientes.carbonoOrganicoTotal : data.micronutrientes.carbonoOrganico,
    correcao_caco3: data.correcao.caco3,
    correcao_camg: data.correcao.camg,
    correcao_prnt: data.correcao.prnt,
    principios_ativos: data.principiosAtivos as unknown as Json,
    recomendacao_dose_ha: data.recomendacaoDoseHa,
    recomendacao_dose_unidade: data.recomendacaoDoseUnidade,
    solubilidade: data.solubilidade,
    indice_salino: data.indiceSalino,
    acido_humico: data.materiaOrganicaNutrientes.acidoHumico,
    acido_fulvico: data.materiaOrganicaNutrientes.acidoFulvico,
    materia_organica_perc: data.materiaOrganicaNutrientes.materiaOrganica,
    aminoacidos: data.materiaOrganicaNutrientes.aminoacidos,
    observacoes: data.observacoes,
    foto_url: data.fotoUrl,
  };
}

export function useInsumos() {
  const { toast } = useToast();
  const [insumos, setInsumos] = useState<(InsumoFormData & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar insumos do banco
  const fetchInsumos = async () => {
    setLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await supabase
      .from('insumos')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Erro ao carregar insumos:', fetchError);
      setError(fetchError.message);
      toast({
        title: "Erro ao carregar insumos",
        description: fetchError.message,
        variant: "destructive",
      });
    } else {
      setInsumos((data || []).map((item) => dbToFormData(item as InsumoFromDb)));
    }
    
    setLoading(false);
  };

  // Adicionar novo insumo
  const addInsumo = async (data: InsumoFormData) => {
    const dbData = formDataToDb(data);

    // Get current user for ownership tracking
    const { data: { session } } = await supabase.auth.getSession();
    
    const { data: newInsumo, error: insertError } = await supabase
      .from('insumos')
      .insert({ ...dbData, created_by: session?.user?.id ?? null } as any)
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao cadastrar insumo:', insertError);
      toast({
        title: "Erro ao cadastrar insumo",
        description: insertError.message,
        variant: "destructive",
      });
      return false;
    }

    setInsumos((prev) => [dbToFormData(newInsumo as InsumoFromDb), ...prev]);
    toast({
      title: "✓ Insumo cadastrado com sucesso",
      description: "O insumo foi salvo no banco de dados.",
      className: "animate-in slide-in-from-top-5 fade-in-0",
    });
    return true;
  };

  // Atualizar insumo existente
  const updateInsumo = async (id: string, data: InsumoFormData) => {
    const dbData = formDataToDb(data);
    
    const { data: updatedInsumo, error: updateError } = await supabase
      .from('insumos')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar insumo:', updateError);
      toast({
        title: "Erro ao atualizar insumo",
        description: updateError.message,
        variant: "destructive",
      });
      return false;
    }

    setInsumos((prev) =>
      prev.map((insumo) => (insumo.id === id ? dbToFormData(updatedInsumo as InsumoFromDb) : insumo))
    );
    toast({
      title: "✓ Insumo atualizado com sucesso",
      description: "As alterações foram salvas.",
      className: "animate-in slide-in-from-top-5 fade-in-0",
    });
    return true;
  };

  // Excluir insumo
  const deleteInsumo = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('insumos')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir insumo:', deleteError);
      toast({
        title: "Erro ao excluir insumo",
        description: deleteError.message,
        variant: "destructive",
      });
      return false;
    }

    setInsumos((prev) => prev.filter((insumo) => insumo.id !== id));
    toast({
      title: "✓ Insumo excluído com sucesso",
      description: "O insumo foi removido do banco de dados.",
      className: "animate-in slide-in-from-top-5 fade-in-0",
    });
    return true;
  };

  // Carregar insumos ao montar o componente
  useEffect(() => {
    fetchInsumos();
  }, []);

  return {
    insumos,
    loading,
    error,
    addInsumo,
    updateInsumo,
    deleteInsumo,
    refetch: fetchInsumos,
  };
}
