import { useState, useEffect } from 'react';
import { ChevronDown, Wheat, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const CULTURES = [
  { id: 'milho-silagem', label: 'Milho Silagem', icon: Wheat },
  { id: 'cafe', label: 'Café', icon: Coffee },
] as const;

type CultureId = typeof CULTURES[number]['id'];

// Simple global state with localStorage persistence
const STORAGE_KEY = 'selected-culture';

function getStoredCulture(): CultureId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && CULTURES.some(c => c.id === stored)) return stored as CultureId;
  } catch {}
  return 'milho-silagem';
}

export const cultureListeners = new Set<(id: CultureId) => void>();
let currentCulture: CultureId = getStoredCulture();

export function getSelectedCulture(): CultureId {
  return currentCulture;
}

function setSelectedCulture(id: CultureId) {
  currentCulture = id;
  localStorage.setItem(STORAGE_KEY, id);
  cultureListeners.forEach(fn => fn(id));
}

function useCulture() {
  const [culture, setCulture] = useState<CultureId>(currentCulture);

  useEffect(() => {
    const handler = (id: CultureId) => setCulture(id);
    cultureListeners.add(handler);
    return () => { cultureListeners.delete(handler); };
  }, []);

  return { culture, setCulture: setSelectedCulture };
}

interface CultureSelectorProps {
  compact?: boolean;
}

export function CultureSelector({ compact }: CultureSelectorProps) {
  const { culture, setCulture } = useCulture();
  const active = CULTURES.find(c => c.id === culture) || CULTURES[0];
  const Icon = active.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border/50 bg-card transition-colors hover:bg-secondary focus:outline-none w-full",
            compact ? "justify-center px-2 py-1.5" : "px-3 py-2"
          )}
          title={active.label}
        >
          <Icon className="w-4 h-4 flex-shrink-0 text-primary" />
          {!compact && (
            <>
              <span className="font-medium text-foreground text-sm truncate">{active.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {CULTURES.map((c) => {
          const CIcon = c.icon;
          const isActive = c.id === culture;
          return (
            <DropdownMenuItem
              key={c.id}
              onClick={() => setCulture(c.id)}
              className={cn(
                "flex items-center gap-3 cursor-pointer",
                isActive && "bg-secondary"
              )}
            >
              <CIcon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
                {c.label}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
