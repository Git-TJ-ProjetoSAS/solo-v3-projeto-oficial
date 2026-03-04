import { LogOut, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUserProfile } from '@/hooks/useUserProfile';

export function UserProfileMenu() {
  const { profile, loading, signOut } = useUserProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-secondary animate-pulse" />
      </div>
    );
  }

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
  const displayEmail = profile?.email || '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-none">{displayName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{displayEmail}</p>
          </div>
          <Avatar className="h-8 w-8 border border-border">
            <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
            <AvatarFallback className="bg-foreground text-background text-xs font-medium">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/perfil')} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>Meu Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/ajustes')} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
