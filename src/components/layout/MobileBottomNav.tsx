import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, Plus, Settings, Zap, ClipboardList, ClipboardCheck, User, SlidersHorizontal, Leaf, TreePine, Home, Droplets, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { useRoutePrefix } from '@/hooks/useRoutePrefix';
import { getSelectedCulture, cultureListeners } from './CultureSelector';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type SheetType = 'analysis' | 'settings' | null;

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { prefixRoute, isClient } = useRoutePrefix();
  const [openSheet, setOpenSheet] = useState<SheetType>(null);
  const [culture, setCulture] = useState(getSelectedCulture());

  useEffect(() => {
    const handler = (id: string) => setCulture(id as any);
    cultureListeners.add(handler);
    return () => { cultureListeners.delete(handler); };
  }, []);

  const isCafe = culture === 'cafe';

  const p = isClient ? '/client' : '';
  const isResultActive = location.pathname === `${p}/resultado` || location.pathname === `${p}/relatorios`;
  const isFoliarActive = location.pathname === `${p}/analise-foliar`;
  const isTalhoesActive = location.pathname === `${p}/talhoes`;
  const isIrrigacaoActive = location.pathname === `${p}/irrigacao`;
  const isFinanceiroActive = location.pathname === `${p}/gestao-financeira`;
  const isOSActive = location.pathname === `${p}/ordens-servico`;
  const isDashboardActive = location.pathname === (isClient ? '/client' : '/');
  const isWizardActive = ['/wizard', '/cultura', '/cafe', '/fitossanitario', '/foliar', '/analise-foliar', '/fitossanidade-milho'].some(r => location.pathname === `${p}${r}`);

  const handleAnalysisOption = (type: 'quick' | 'complete') => {
    setOpenSheet(null);
    navigate(prefixRoute(type === 'quick' ? '/analise-rapida' : '/cultura'));
  };

  const handleSettingsOption = (option: 'profile' | 'account') => {
    setOpenSheet(null);
    if (option === 'profile') {
      navigate('/perfil');
    } else {
      navigate('/ajustes');
    }
  };

  return (
    <>
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          {isCafe ? (
            <>
              {/* Café: Dashboard, Talhões, Irrigação, Custos, OS, Ajustes */}
              <button
                onClick={() => { triggerHaptic(); navigate(isClient ? '/client' : '/'); }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
                  isDashboardActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Home className="w-5 h-5" />
                <span className="text-[10px] font-medium">Painel</span>
              </button>

              <button
                onClick={() => { triggerHaptic(); navigate(prefixRoute('/talhoes')); }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
                  isTalhoesActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <TreePine className="w-5 h-5" />
                <span className="text-[10px] font-medium">Talhões</span>
              </button>

              <button
                onClick={() => { triggerHaptic(); navigate(prefixRoute('/irrigacao')); }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
                  isIrrigacaoActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Droplets className="w-5 h-5" />
                <span className="text-[10px] font-medium">Irrigação</span>
              </button>

              <button
                onClick={() => { triggerHaptic(); navigate(prefixRoute('/gestao-financeira')); }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
                  isFinanceiroActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <DollarSign className="w-5 h-5" />
                <span className="text-[10px] font-medium">Custos</span>
              </button>

              <button
                onClick={() => { triggerHaptic(); navigate(prefixRoute('/ordens-servico')); }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
                  isOSActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <ClipboardCheck className="w-5 h-5" />
                <span className="text-[10px] font-medium">OS</span>
              </button>

              <button
                onClick={() => { triggerHaptic(); setOpenSheet('settings'); }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
                  openSheet === 'settings' ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Settings className="w-5 h-5" />
                <span className="text-[10px] font-medium">Ajustes</span>
              </button>
            </>
          ) : (
            <>
              {/* Milho: Resultados, Foliar, +Análise, Financeiro, Ajustes */}
              <button
                onClick={() => { triggerHaptic(); navigate(prefixRoute('/resultado')); }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
                  isResultActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <FileText className="w-5 h-5" />
                <span className="text-xs font-medium">Resultados</span>
              </button>

              <button
                onClick={() => { triggerHaptic(); navigate(prefixRoute('/analise-foliar')); }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
                  isFoliarActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Leaf className="w-5 h-5" />
                <span className="text-xs font-medium">Foliar</span>
              </button>

              <button
                onClick={() => { triggerHaptic(15); setOpenSheet('analysis'); }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
                  isWizardActive || openSheet === 'analysis' ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <div className="w-10 h-10 -mt-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium -mt-0.5">Análise</span>
              </button>

              <button
                onClick={() => { triggerHaptic(); navigate(prefixRoute('/gestao-financeira')); }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
                  isFinanceiroActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <DollarSign className="w-5 h-5" />
                <span className="text-xs font-medium">Custos</span>
              </button>

              <button
                onClick={() => { triggerHaptic(); setOpenSheet('settings'); }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
                  openSheet === 'settings' ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Settings className="w-5 h-5" />
                <span className="text-xs font-medium">Ajustes</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Analysis Sheet */}
      <Sheet open={openSheet === 'analysis'} onOpenChange={(open) => setOpenSheet(open ? 'analysis' : null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="text-left pb-4">
            <SheetTitle>Nova Análise</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 pb-6">
            <button
              onClick={() => handleAnalysisOption('quick')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Análise Rápida</p>
                <p className="text-sm text-muted-foreground">Faça uma análise rápida</p>
              </div>
            </button>
            <button
              onClick={() => handleAnalysisOption('complete')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Análise Completa</p>
                <p className="text-sm text-muted-foreground">Faça uma análise completa</p>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Settings Sheet */}
      <Sheet open={openSheet === 'settings'} onOpenChange={(open) => setOpenSheet(open ? 'settings' : null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="text-left pb-4">
            <SheetTitle>Configurações</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 pb-6">
            <button
              onClick={() => handleSettingsOption('profile')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Meu Perfil</p>
                <p className="text-sm text-muted-foreground">Informações pessoais e foto</p>
              </div>
            </button>
            <button
              onClick={() => handleSettingsOption('account')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Ajustes da Conta</p>
                <p className="text-sm text-muted-foreground">Preferências e notificações</p>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
