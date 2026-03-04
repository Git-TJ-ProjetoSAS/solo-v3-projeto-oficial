import { ReactNode, useState, useEffect } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { 
  BarChart3,
  ChevronLeft,
  ClipboardList, 
  Coffee,
  DollarSign,
  Download,
  Droplets,
  Home, 
  Leaf, 
  Menu,
  Package, 
  TreePine,
  Wand2,
  Wheat
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HeaderStats } from './HeaderStats';
import { UserProfileMenu } from './UserProfileMenu';
import { FarmSelector } from '@/components/FarmSelector';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { ConnectionIndicator } from './ConnectionIndicator';
import { OfflineBanner } from './OfflineBanner';
import { WaterAlertBell } from './WaterAlertBell';
import { CultureSelector, getSelectedCulture, cultureListeners } from './CultureSelector';
import { LOGO_URL } from '@/lib/constants';


interface DashboardLayoutProps {
  children?: ReactNode;
}

const milhoMenuItems = [
  { title: 'Painel', url: '/', icon: Home },
  { title: 'Central de Custos', url: '/gestao-financeira', icon: DollarSign },
  { title: 'Análise Completa', url: '/wizard', icon: Wand2 },
  { title: 'Análise Foliar', url: '/analise-foliar', icon: Leaf },
  { title: 'Relatórios', url: '/relatorios', icon: ClipboardList },
  { title: 'Insumos', url: '/insumos', icon: Package },
];

const cafeMenuItems = [
  { title: 'Painel', url: '/', icon: Home },
  { title: 'Central de Custos', url: '/gestao-financeira', icon: DollarSign },
  { title: 'Talhões', url: '/talhoes', icon: TreePine },
  { title: 'Irrigação', url: '/irrigacao', icon: Droplets },
  { title: 'Ordens de Serviço', url: '/ordens-servico', icon: ClipboardList },
  { title: 'Comparar', url: '/comparar', icon: BarChart3 },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [culture, setCulture] = useState(getSelectedCulture());
  const location = useLocation();
  const { canInstall, install } = usePwaInstall();
  

  // Listen for culture changes
  useEffect(() => {
    const handler = (id: string) => setCulture(id as any);
    cultureListeners.add(handler);
    return () => { cultureListeners.delete(handler); };
  }, []);

  const menuItems = culture === 'cafe' ? cafeMenuItems : milhoMenuItems;

  return (
    <>
      {/* Mobile Layout */}
      <div className="md:hidden min-h-screen flex flex-col bg-background">
        <MobileHeader />
        <OfflineBanner />
        <main className="flex-1 px-4 pb-24 overflow-auto">
          {children ?? <Outlet />}
        </main>
        <MobileBottomNav />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex min-h-screen w-full bg-background">
        {/* Sidebar */}
        <aside 
          className={cn(
            "h-screen sticky top-0 border-r border-border bg-card flex flex-col overflow-hidden transition-[width] duration-200 ease-in-out",
            sidebarOpen ? "w-60" : "w-16"
          )}
        >
          {/* Logo + Toggle */}
          <div className="h-20 flex items-center px-4 border-b border-border shrink-0">
            {sidebarOpen ? (
              <div className="flex items-center justify-between w-full">
                <img src={LOGO_URL} alt="Solo V3" className="w-[80px] object-contain" />
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-secondary transition-colors shrink-0"
                >
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-secondary transition-colors mx-auto"
              >
                <Menu className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Culture Selector in Sidebar */}
          <div className={cn("px-2 pt-4 pb-2 shrink-0", !sidebarOpen && "px-1")}>
            <CultureSelector compact={!sidebarOpen} />
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-2 px-2 overflow-y-auto">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const isActive = item.url === '/' 
                  ? location.pathname === '/' 
                  : location.pathname === item.url || location.pathname.startsWith(item.url + '/');
                return (
                  <li key={item.title}>
                    <NavLink
                      to={item.url}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-100",
                        isActive 
                          ? "bg-foreground text-background" 
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                        !sidebarOpen && "justify-center px-2"
                      )}
                      title={!sidebarOpen ? item.title : undefined}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-125 group-hover:rotate-6" />
                      {sidebarOpen && <span>{item.title}</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            {canInstall && (
              <button
                onClick={install}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-100 text-primary hover:bg-primary/10",
                  !sidebarOpen && "justify-center px-2"
                )}
                title="Instalar aplicativo"
              >
                <Download className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span>Instalar App</span>}
              </button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-screen">
          {/* Header */}
          <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-10">
            <HeaderStats />
            <div className="flex items-center gap-4">
              <ConnectionIndicator />
              <WaterAlertBell />
              <FarmSelector />
              <div className="h-6 w-px bg-border" />
              <UserProfileMenu />
            </div>
          </header>

          <OfflineBanner />
          {/* Page Content */}
          <div className="flex-1 p-6 md:p-8 overflow-auto">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>
    </>
  );
}