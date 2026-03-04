import { useNavigate } from 'react-router-dom';
import { Leaf, Coffee, ArrowRight, Bug } from 'lucide-react';
import { useRoutePrefix } from '@/hooks/useRoutePrefix';

const cultures = [
  {
    id: 'milho',
    title: 'Milho Silagem',
    description: 'Planejamento completo para milho: análise de solo, adubação, sementes, pulverização e custos.',
    icon: Leaf,
    route: '/wizard',
    tags: ['Solo', 'Sementes', 'Pulverização', 'Custos'],
  },
  {
    id: 'cafe',
    title: 'Café',
    description: 'Gestão agronômica para café Conilon e Arábica: nutrição, manejo, fitossanitário e produtividade.',
    icon: Coffee,
    route: '/cafe',
    tags: ['Conilon', 'Arábica', 'Adubação', 'Fitossanitário'],
  },
  {
    id: 'bio',
    title: '🧬 Solo Bio',
    description: 'Gestão de defensivos biológicos para café: viabilidade climática, compatibilidade e ordens de serviço.',
    icon: Bug,
    route: '/bio',
    tags: ['Biológicos', 'Clima', 'Compatibilidade', 'OS'],
    accent: true,
  },
];

export default function CultureSelect() {
  const navigate = useNavigate();
  const { prefixRoute } = useRoutePrefix();

  const handleCultureClick = (culture: typeof cultures[number]) => {
    if (culture.id === 'cafe') {
      try { localStorage.removeItem('coffee_wizard_state'); } catch { /* ignore */ }
      navigate(prefixRoute(culture.route), { state: { freshStart: true } });
    } else {
      navigate(prefixRoute(culture.route));
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[70vh] py-8 px-4"
      style={{ animation: 'fade-in 0.4s ease-out' }}
    >
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-14 h-14 rounded-full bg-foreground flex items-center justify-center mb-5 mx-auto">
          <Leaf className="w-7 h-7 text-background" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
          Escolha a Cultura
        </h1>
        <p className="text-muted-foreground text-sm max-w-md">
          Selecione a cultura para iniciar o planejamento agronômico da sua safra.
        </p>
      </div>

      {/* Culture Cards */}
      <div className="grid gap-4 w-full max-w-lg">
        {cultures.map((culture, index) => (
          <button
            key={culture.id}
            onClick={() => handleCultureClick(culture)}
            className={`group w-full text-left p-6 rounded-2xl border transition-all duration-200 ${
              (culture as any).accent
                ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-amber-50/40 hover:border-emerald-400'
                : 'border-border bg-card hover:border-primary/50'
            }`}
            style={{ animation: `slide-up 0.3s ease-out ${index * 80}ms backwards` }}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                (culture as any).accent
                  ? 'bg-emerald-100 group-hover:bg-emerald-200'
                  : 'bg-secondary group-hover:bg-primary/10'
              }`}>
                <culture.icon className={`w-6 h-6 transition-colors ${
                  (culture as any).accent
                    ? 'text-emerald-600'
                    : 'text-foreground group-hover:text-primary'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-semibold text-foreground">
                    {culture.title}
                  </h3>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {culture.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {culture.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        (culture as any).accent
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
