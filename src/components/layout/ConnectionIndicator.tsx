import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useConnectionStatus, ConnectionState } from '@/hooks/useConnectionStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const statusConfig: Record<ConnectionState, {
  icon: typeof Cloud;
  color: string;
  bgColor: string;
  label: string;
  animate?: boolean;
}> = {
  online: {
    icon: Cloud,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    label: 'Online e Sincronizado',
  },
  offline: {
    icon: CloudOff,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    label: 'Offline — Salvando localmente',
  },
  syncing: {
    icon: RefreshCw,
    color: 'text-accent-foreground',
    bgColor: 'bg-accent/10',
    label: 'Sincronizando...',
    animate: true,
  },
};

export function ConnectionIndicator({ compact = false }: { compact?: boolean }) {
  const { status, totalPending, pendingMutations, pendingUploads } = useConnectionStatus();
  const { isSyncing } = useOfflineSync();

  const effectiveStatus = isSyncing ? 'syncing' : status;
  const config = statusConfig[effectiveStatus];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors duration-300',
              config.bgColor
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4 transition-colors duration-300',
                config.color,
                config.animate && 'animate-spin'
              )}
            />
            {!compact && (
              <span className={cn('text-xs font-medium', config.color)}>
                {effectiveStatus === 'offline' ? 'Offline' : effectiveStatus === 'syncing' ? 'Sync...' : 'Online'}
              </span>
            )}
            {totalPending > 0 && (
              <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {totalPending}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-sm font-medium">{config.label}</p>
          {pendingMutations > 0 && (
            <p className="text-xs text-muted-foreground">
              {pendingMutations} registro{pendingMutations > 1 ? 's' : ''} de irrigação/chuva pendente{pendingMutations > 1 ? 's' : ''}
            </p>
          )}
          {pendingUploads > 0 && (
            <p className="text-xs text-muted-foreground">
              {pendingUploads} foto{pendingUploads > 1 ? 's' : ''} na fila de upload
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
