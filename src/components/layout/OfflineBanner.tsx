import { WifiOff, RefreshCw, CloudOff } from 'lucide-react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
  const { status, totalPending, pendingMutations, pendingUploads } = useConnectionStatus();
  const { isSyncing } = useOfflineSync();

  const isOffline = status === 'offline';
  const isSyncingNow = isSyncing || status === 'syncing';

  if (!isOffline && !isSyncingNow && totalPending === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-300',
        isOffline
          ? 'bg-destructive text-destructive-foreground'
          : isSyncingNow
            ? 'bg-accent text-accent-foreground'
            : 'bg-muted text-muted-foreground'
      )}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            Sem conexão — seus dados estão salvos localmente
            {totalPending > 0 && (
              <span className="ml-1 font-bold">
                ({totalPending} operaç{totalPending === 1 ? 'ão pendente' : 'ões pendentes'})
              </span>
            )}
          </span>
        </>
      ) : isSyncingNow ? (
        <>
          <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
          <span>
            Sincronizando {totalPending} operaç{totalPending === 1 ? 'ão' : 'ões'}...
          </span>
        </>
      ) : (
        <>
          <CloudOff className="h-4 w-4 shrink-0" />
          <span>
            {pendingMutations > 0 && `${pendingMutations} registro${pendingMutations > 1 ? 's' : ''} pendente${pendingMutations > 1 ? 's' : ''}`}
            {pendingMutations > 0 && pendingUploads > 0 && ' · '}
            {pendingUploads > 0 && `${pendingUploads} upload${pendingUploads > 1 ? 's' : ''} na fila`}
          </span>
        </>
      )}
    </div>
  );
}
