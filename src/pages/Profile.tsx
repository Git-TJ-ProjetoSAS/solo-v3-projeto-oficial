import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, Save, Phone, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Profile() {
  const navigate = useNavigate();
  const { profile, loading } = useUserProfile();
  const { uploadAvatar, uploading } = useAvatarUpload();
  const { isConsultor } = useUserRole();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [fullName, setFullName] = useState('');
  const [creaArt, setCreaArt] = useState('');
  const [telefone, setTelefone] = useState('');
  const [enderecoPropriedade, setEnderecoPropriedade] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url);
      setCreaArt(profile.crea_art || '');
      setTelefone(profile.telefone || '');
      setEnderecoPropriedade(profile.endereco_propriedade || '');
    }
  }, [profile]);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input changed');
    const file = e.target.files?.[0];
    console.log('Selected file:', file?.name, 'Profile ID:', profile?.id);
    
    if (!file) {
      console.log('No file selected');
      return;
    }
    
    if (!profile?.id) {
      console.log('No profile ID - user may not be logged in');
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para alterar a foto.',
        variant: 'destructive',
      });
      return;
    }
    
    const newUrl = await uploadAvatar(file, profile.id);
    if (newUrl) {
      setAvatarUrl(newUrl);
    }
    
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = { 
        full_name: fullName.trim(),
        telefone: telefone.trim() || null,
        endereco_propriedade: enderecoPropriedade.trim() || null,
      };
      if (isConsultor) {
        updateData.crea_art = creaArt.trim() || null;
      }
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', profile.id);

      if (error) throw error;

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar seu perfil.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
        <h1 className="font-semibold text-foreground">Meu Perfil</h1>
      </header>

      <div className="p-6 max-w-md mx-auto space-y-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-border">
              <AvatarImage 
                src={avatarUrl || undefined} 
                alt={profile?.full_name || 'Usuário'} 
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-medium">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {uploading ? 'Enviando...' : 'Toque para alterar a foto'}
          </p>
        </div>

        <Separator />

        {/* Form Section */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              value={profile?.email || ''}
              disabled
              className="bg-secondary"
            />
            <p className="text-xs text-muted-foreground">
              O e-mail não pode ser alterado
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco" className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Endereço da Propriedade
            </Label>
            <Input
              id="endereco"
              value={enderecoPropriedade}
              onChange={(e) => setEnderecoPropriedade(e.target.value)}
              placeholder="Ex: Linhares, ES"
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">
              Informe a cidade e estado (ex: Linhares, ES). Usado no cronograma de irrigação e na Lâmina de Investimento.
            </p>
          </div>

          {isConsultor && (
            <div className="space-y-2">
              <Label htmlFor="creaArt">CREA / ART</Label>
              <Input
                id="creaArt"
                value={creaArt}
                onChange={(e) => setCreaArt(e.target.value)}
                placeholder="Ex: CREA-SP 123456 / ART 789012"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">
                Aparecerá automaticamente na Lâmina de Investimento
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving || !fullName.trim()}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar alterações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
