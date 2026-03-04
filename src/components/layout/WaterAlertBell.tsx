import { useState } from 'react';
import { Bell, BellRing, Droplets, X, CheckCheck, AlertTriangle } from 'lucide-react';
import { useWaterAlerts } from '@/hooks/useWaterAlerts';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export function WaterAlertBell() {
  const { alerts, unreadCount, markRead, markAllRead } = useWaterAlerts();
  const { isSupported, isSubscribed, permission, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const [open, setOpen] = useState(false);

  const handleTogglePush = async () => {
    if (isSubscribed) {
      await unsubscribe();
      toast.info('Notificações push desativadas');
    } else {
      const ok = await subscribe();
      if (ok) {
        toast.success('Notificações push ativadas!');
      } else if (permission === 'denied') {
        toast.error('Permissão de notificações bloqueada no navegador');
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center h-9 w-9 rounded-full hover:bg-secondary transition-colors"
          aria-label="Alertas hídricos"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Droplets className="h-4 w-4 text-primary" />
            Alertas Hídricos
          </h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => markAllRead()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>

        {isSupported && (
          <div className="px-4 py-2 border-b border-border">
            <Button
              variant={isSubscribed ? 'secondary' : 'outline'}
              size="sm"
              className="w-full h-8 text-xs gap-2"
              onClick={handleTogglePush}
              disabled={pushLoading || permission === 'denied'}
            >
              <BellRing className="h-3.5 w-3.5" />
              {pushLoading
                ? 'Processando...'
                : isSubscribed
                ? 'Push ativado ✓'
                : permission === 'denied'
                ? 'Bloqueado pelo navegador'
                : 'Ativar notificações push'}
            </Button>
          </div>
        )}

        <ScrollArea className="max-h-72">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Droplets className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Nenhum alerta pendente</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50',
                    alert.severity === 'critical' && 'bg-destructive/5'
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      'h-4 w-4 mt-0.5 shrink-0',
                      alert.severity === 'critical'
                        ? 'text-destructive'
                        : 'text-warning'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed">{alert.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(alert.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => markRead(alert.id)}
                    className="shrink-0 p-1 rounded hover:bg-secondary transition-colors"
                    aria-label="Marcar como lido"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
