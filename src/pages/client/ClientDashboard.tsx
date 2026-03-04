import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Leaf, FileText, TrendingUp, Coffee, Wand2, TreePine, ArrowRight, Sprout, ShieldAlert } from 'lucide-react';
import { getSelectedCulture, cultureListeners } from '@/components/layout/CultureSelector';

export default function ClientDashboard() {
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const firstName = profile?.full_name?.split(' ')[0] || 'Produtor';
  const [culture, setCulture] = useState(getSelectedCulture());

  useEffect(() => {
    const handler = (id: string) => setCulture(id as any);
    cultureListeners.add(handler);
    return () => { cultureListeners.delete(handler); };
  }, []);

  const isCafe = culture === 'cafe';

  const handleStartCafePlanning = () => {
    try { localStorage.removeItem('coffee_wizard_state'); } catch { /* ignore */ }
    navigate('/client/cafe', { state: { freshStart: true } });
  };

  const cafeActions = [
    {
      title: 'Iniciar Planejamento',
      description: 'Selecione Conilon ou Arábica e inicie o fluxo completo de adubação.',
      icon: Coffee,
      onClick: handleStartCafePlanning,
    },
    {
      title: 'Gerenciar Talhões',
      description: 'Cadastre e gerencie seus talhões de café.',
      icon: TreePine,
      route: '/client/talhoes',
    },
  ];

  const milhoActions = [
    {
      title: 'Análise Rápida',
      description: 'Inicie uma análise rápida de solo e adubação.',
      icon: Wand2,
      route: '/client/analise-rapida',
    },
    {
      title: 'Análise Foliar',
      description: 'Faça uma análise foliar completa da sua lavoura.',
      icon: Leaf,
      route: '/client/analise-foliar',
    },
    {
      title: 'Fitossanidade',
      description: 'Identifique pragas e doenças com IA e receba receita de calda.',
      icon: ShieldAlert,
      route: '/client/fitossanidade-milho',
    },
  ];

  const quickActions = isCafe ? cafeActions : milhoActions;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Olá, {firstName}!</h1>
        <p className="text-muted-foreground mt-1">Acompanhe suas análises e relatórios</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {quickActions.map((action) => (
          <button
            key={action.title}
            onClick={() => 'onClick' in action ? (action as any).onClick() : navigate((action as any).route)}
            className="group w-full text-left p-5 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-secondary group-hover:bg-primary/10 flex items-center justify-center transition-colors shrink-0">
                <action.icon className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-foreground">{action.title}</h3>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {action.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Análises</CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">análises realizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Foliar</CardTitle>
            <Leaf className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">análises foliares</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Relatórios</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">relatórios gerados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Produtividade</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">meta atual</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
