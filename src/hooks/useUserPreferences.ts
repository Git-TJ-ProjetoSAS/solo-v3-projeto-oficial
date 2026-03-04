import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserPreferences {
  dark_mode: boolean;
  notifications_enabled: boolean;
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>({
    dark_mode: true, // Default to dark mode (X/Twitter theme)
    notifications_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Load from localStorage initially for immediate dark mode
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    // Default to dark mode if not set
    if (savedDarkMode === null || savedDarkMode === 'true') {
      setPreferences(prev => ({ ...prev, dark_mode: true }));
    } else {
      setPreferences(prev => ({ ...prev, dark_mode: false }));
    }
  }, []);

  useEffect(() => {
    async function fetchPreferences() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserId(user.id);
          
          const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (error && error.code === 'PGRST116') {
            // No preferences found, create default ones
            const { data: newPrefs } = await supabase
              .from('user_preferences')
              .insert({ user_id: user.id })
              .select()
              .single();

            if (newPrefs) {
              setPreferences({
                dark_mode: newPrefs.dark_mode,
                notifications_enabled: newPrefs.notifications_enabled,
              });
              localStorage.setItem('darkMode', String(newPrefs.dark_mode));
            }
          } else if (data) {
            setPreferences({
              dark_mode: data.dark_mode,
              notifications_enabled: data.notifications_enabled,
            });
            localStorage.setItem('darkMode', String(data.dark_mode));
          }
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPreferences();
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (preferences.dark_mode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [preferences.dark_mode]);

  const updatePreference = async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    if (!userId) return;

    setPreferences((prev) => ({ ...prev, [key]: value }));
    
    // Save dark mode to localStorage for instant load
    if (key === 'dark_mode') {
      localStorage.setItem('darkMode', String(value));
    }

    try {
      await supabase
        .from('user_preferences')
        .update({ [key]: value })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error updating preference:', error);
      // Revert on error
      setPreferences((prev) => ({ ...prev, [key]: !value }));
      if (key === 'dark_mode') {
        localStorage.setItem('darkMode', String(!value));
      }
    }
  };

  return {
    preferences,
    loading,
    updatePreference,
  };
}
