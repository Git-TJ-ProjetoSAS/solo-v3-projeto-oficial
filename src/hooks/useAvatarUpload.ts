import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAvatarUpload() {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadAvatar = async (file: File, userId: string): Promise<string | null> => {
    if (!file || !userId) return null;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const isValidType = validTypes.includes(file.type) || file.name.match(/\.(jpg|jpeg|png|webp)$/i);
    
    if (!isValidType) {
      toast({
        title: 'Formato inválido',
        description: 'Use imagens JPG, PNG ou WebP.',
        variant: 'destructive',
      });
      return null;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é 5MB.',
        variant: 'destructive',
      });
      return null;
    }

    setUploading(true);

    try {
      let fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      if (fileExt === 'jpeg') fileExt = 'jpg';
      
      const fileName = `${userId}/avatar.${fileExt}`;

      // Delete old avatars first
      await supabase.storage
        .from('avatars')
        .remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`, `${userId}/avatar.webp`]);

      // Upload new avatar
      const contentType = file.type || 'image/jpeg';
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          upsert: true,
          contentType,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with cache buster
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      toast({
        title: 'Foto atualizada',
        description: 'Sua foto de perfil foi alterada com sucesso.',
      });

      return avatarUrl;
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Erro ao enviar foto',
        description: error?.message || 'Não foi possível atualizar sua foto de perfil.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadAvatar, uploading };
}
