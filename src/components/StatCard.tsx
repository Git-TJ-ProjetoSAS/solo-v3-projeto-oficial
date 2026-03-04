import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
  delay?: number;
}

const trendConfig = {
  up: { icon: TrendingUp, color: 'text-success' },
  down: { icon: TrendingDown, color: 'text-destructive' },
  neutral: { icon: Minus, color: 'text-muted-foreground' },
};

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend,
  trendValue,
  className,
  delay = 0
}: StatCardProps) {
  const trendInfo = trend ? trendConfig[trend] : null;
  const TrendIcon = trendInfo?.icon;
  
  return (
    <div 
      className={cn(
        "group relative p-6 bg-card border border-border rounded-2xl transition-all duration-300 hover:shadow-md hover:-translate-y-1",
        className
      )}
      style={{ 
        animationDelay: `${delay}ms`,
        animation: 'fade-in 0.4s ease-out backwards'
      }}
    >
      {/* Icon - top right */}
      <div className="absolute top-5 right-5">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <Icon className="w-5 h-5 text-foreground" />
        </div>
      </div>

      {/* Content */}
      <div className="pr-16">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          {title}
        </p>
        <p className="text-3xl font-semibold text-foreground tracking-tight mb-1">
          {value}
        </p>
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {trend && trendValue && TrendIcon && (
          <div className={cn(
            "flex items-center gap-1.5 text-xs font-medium mt-3",
            trendInfo?.color
          )}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span>{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}
