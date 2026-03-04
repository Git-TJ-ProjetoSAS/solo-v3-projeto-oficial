import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ConnectionIndicator } from './ConnectionIndicator';
import { WaterAlertBell } from './WaterAlertBell';
import { CultureSelector } from './CultureSelector';
import { LOGO_URL } from '@/lib/constants';

export function MobileHeader() {
  const { profile, loading } = useUserProfile();

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = profile?.full_name || 'Usuário';

  return (
    <header className="h-14 px-4 flex items-center justify-between bg-background sticky top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <a href="/">
          <img src={LOGO_URL} alt="Solo V3" className="h-10 object-contain" />
        </a>
        <CultureSelector compact />
      </div>
      
      {/* Status + Profile */}
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="h-4 w-20 rounded bg-secondary animate-pulse" />
          <div className="h-9 w-9 rounded-full bg-secondary animate-pulse" />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <ConnectionIndicator compact />
          <WaterAlertBell />
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </header>
  );
}
