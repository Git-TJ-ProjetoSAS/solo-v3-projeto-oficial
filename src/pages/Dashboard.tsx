import { Beaker, Calculator, DollarSign, Leaf, TrendingUp, ArrowRight, Sparkles, Coffee, TreePine, Wand2, ClipboardList, ShieldAlert } from 'lucide-react';
import { useFarmData } from '@/hooks/useFarmData';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Link } from 'react-router-dom';
import { getSelectedCulture, cultureListeners } from '@/components/layout/CultureSelector';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [culture, setCulture] = useState(getSelectedCulture());
  const { 
    selectedFarm, 
    farms,
    getSelectedFarmSoilAnalyses, 
    getSelectedFarmSeedCalculations,
    getTotalCostPerHectare 
  } = useFarmData();

  useEffect(() => {
    const handler = (id: string) => setCulture(id as any);
    cultureListeners.add(handler);
    return () => { cultureListeners.delete(handler); };
  }, []);

  const soilAnalyses = getSelectedFarmSoilAnalyses();
  const seedCalculations = getSelectedFarmSeedCalculations();
  const latestSoil = soilAnalyses[soilAnalyses.length - 1];
  const latestSeed = seedCalculations[seedCalculations.length - 1];
  const totalCost = selectedFarm ? getTotalCostPerHectare(selectedFarm.id) : 0;

  const isCafe = culture === 'cafe';
  const cultureLabel = isCafe ? 'Café' : 'Milho Silagem';

  if (farms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div 
          className="p-12 max-w-md bg-card border border-border rounded-3xl"
          style={{ animation: 'scale-in 0.3s ease-out' }}
        >
          <div className="w-20 h-20 rounded-full bg-foreground flex items-center justify-center mb-6 mx-auto">
            <Leaf className="w-10 h-10 text-background" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-3 tracking-tight">
            Bem-vindo ao Solo
          </h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Comece cadastrando sua primeira fazenda para gerenciar análises de solo, 
            população de sementes e custos de produção.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4" />
            <span>Use o seletor de fazendas no cabeçalho</span>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedFarm) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="p-8 bg-card border border-border rounded-2xl">
          <p className="text-muted-foreground">
            Selecione uma fazenda no menu acima para visualizar o dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Quick links por cultura
  const milhoQuickLinks = [
    { to: '/wizard', icon: Wand2, label: 'Análise Completa' },
    { to: '/fitossanidade-milho', icon: ShieldAlert, label: 'Fitossanidade' },
    { to: '/analise-foliar', icon: Leaf, label: 'Análise Foliar' },
    { to: '/relatorios', icon: ClipboardList, label: 'Relatórios' },
  ];

  const cafeQuickLinks = [
    { to: '/talhoes', icon: TreePine, label: 'Talhões' },
  ];

  const quickLinks = isCafe ? cafeQuickLinks : milhoQuickLinks;

  const summaryItems = [
    { label: 'Fazendas Cadastradas', value: farms.length },
    ...(isCafe 
      ? []
      : [
          { label: 'Análises de Solo', value: soilAnalyses.length },
          { label: 'Cálculos de População', value: seedCalculations.length },
        ]
    ),
  ];

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Dashboard"
        description={`Visão geral da fazenda ${selectedFarm.name}`}
      />

      {/* Stats Grid */}
      {!isCafe && (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Saturação por Bases"
            value={latestSoil ? `${latestSoil.vPercent.toFixed(1)}%` : '--'}
            icon={Beaker}
            description={latestSoil 
              ? latestSoil.vPercent >= 60 
                ? 'Dentro do ideal' 
                : 'Abaixo do recomendado'
              : 'Sem análise'
            }
            trend={latestSoil ? (latestSoil.vPercent >= 60 ? 'up' : 'down') : 'neutral'}
            trendValue={latestSoil ? (latestSoil.vPercent >= 60 ? 'Adequado' : 'Correção') : undefined}
            delay={0}
          />

          <StatCard
            title="População"
            value={latestSeed ? latestSeed.populationPerHectare.toLocaleString('pt-BR') : '--'}
            icon={Leaf}
            description="Plantas por hectare"
            delay={50}
          />

          <StatCard
            title="Custo Total/ha"
            value={totalCost > 0 ? `R$ ${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '--'}
            icon={DollarSign}
            description="Soma dos insumos"
            delay={100}
          />

          <StatCard
            title="Análises"
            value={soilAnalyses.length}
            icon={Calculator}
            description="Total realizadas"
            delay={150}
          />
        </div>
      )}

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Access */}
        <div 
          className="bg-card border border-border rounded-2xl p-6"
          style={{ animation: 'fade-in 0.4s ease-out 200ms backwards' }}
        >
          <div className="flex items-center gap-2 mb-5">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Acesso Rápido
            </h3>
          </div>
          <div className={`grid gap-3 ${quickLinks.length >= 3 ? 'sm:grid-cols-3' : quickLinks.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1 max-w-xs'}`}>
            {quickLinks.map((link, index) => (
              <Link 
                key={link.to} 
                to={link.to}
                className="group flex flex-col items-center gap-3 p-5 rounded-xl border border-border bg-background hover:bg-secondary hover:border-transparent transition-all duration-200"
                style={{ animationDelay: `${250 + index * 50}ms` }}
              >
                <div className="w-12 h-12 rounded-full bg-secondary group-hover:bg-background flex items-center justify-center transition-colors duration-200">
                  <link.icon className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-sm font-medium text-foreground">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div 
          className="bg-card border border-border rounded-2xl p-6"
          style={{ animation: 'fade-in 0.4s ease-out 250ms backwards' }}
        >
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Resumo
            </h3>
          </div>
          <div className="space-y-2">
            {summaryItems.map((item) => (
              <div 
                key={item.label}
                className="flex justify-between items-center py-3 px-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors duration-150"
              >
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-semibold text-foreground">{item.value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-foreground text-background">
              <span className="text-sm">Cultura Ativa</span>
              <span className="text-sm font-semibold">{cultureLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
