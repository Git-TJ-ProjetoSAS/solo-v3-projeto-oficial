import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6",
      className
    )}
    style={{ animation: 'fade-in 0.3s ease-out' }}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
