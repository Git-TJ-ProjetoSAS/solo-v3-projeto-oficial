import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Key, Loader2, LogOut, Moon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AccountSettings() {
  const navigate = useNavigate();
  const { signOut } = useUserProfile();
  const { preferences, updatePreference, loading: prefsLoading } = useUserPreferences();
  const { toast } = useToast();
  
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'A confirmação de senha não corresponde.',
        variant: 'destructive',
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi atualizada com sucesso.',
      });
      setPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: 'Erro ao alterar senha',
        description: error.message || 'Não foi possível alterar sua senha.',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (prefsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 px-4 flex items-center gap-3 bg-background sticky top-0 z-40 border-b border-border">
        <button
          onClick={() => navigate('/resultado')}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-semibold text-foreground">Ajustes da Conta</h1>
      </header>

      <div className="p-6 max-w-md mx-auto space-y-8">
        {/* Preferences Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Preferências
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Bell className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Notificações</p>
                  <p className="text-sm text-muted-foreground">Receber alertas e atualizações</p>
                </div>
              </div>
              <Switch
                checked={preferences.notifications_enabled}
                onCheckedChange={(checked) => updatePreference('notifications_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Moon className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Modo escuro</p>
                  <p className="text-sm text-muted-foreground">Tema escuro para o aplicativo</p>
                </div>
              </div>
              <Switch
                checked={preferences.dark_mode}
                onCheckedChange={(checked) => updatePreference('dark_mode', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Security Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Segurança
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Key className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Alterar senha</p>
                  <p className="text-sm text-muted-foreground">Atualize sua senha de acesso</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPasswordDialogOpen(true)}
              >
                Alterar
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Logout Section */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Sair da conta
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sair da conta?</AlertDialogTitle>
              <AlertDialogDescription>
                Você será desconectado do Connect Solo. Será necessário fazer login novamente para acessar sua conta.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleSignOut}>
                Sair
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground pt-4">
          Connect Solo v1.0.0
        </p>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
            <DialogDescription>
              Digite sua nova senha. Ela deve ter pelo menos 6 caracteres.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setPasswordDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword || !confirmPassword}
            >
              {changingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Alterando...
                </>
              ) : (
                'Alterar senha'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
