import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Handle both standard base64 and URL-safe base64
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      checkExistingSubscription();
    }
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch {
      setIsSubscribed(false);
    }
  };

  const subscribe = useCallback(async () => {
    if (!isSupported) return false;
    setLoading(true);

    try {
      // Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setLoading(false);
        return false;
      }

      // Get VAPID public key from edge function
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke(
        'manage-push',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          body: undefined,
        }
      );

      // Fallback: fetch directly with query param
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/manage-push?action=vapid-public-key`
      );
      const { publicKey } = await res.json();

      if (!publicKey) throw new Error('Failed to get VAPID public key');

      // Subscribe to push
      const registration = await navigator.serviceWorker.ready;
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      const subscription = await (registration as any).pushManager.subscribe({
        userVisuallyIndicatesPermission: true,
        applicationServerKey,
      });

      // Store subscription in backend
      const subJson = subscription.toJSON();
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) throw new Error('Not authenticated');

      const storeRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/manage-push?action=subscribe`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subscription: {
              endpoint: subJson.endpoint,
              keys: subJson.keys,
            },
          }),
        }
      );

      if (!storeRes.ok) throw new Error('Failed to store subscription');

      setIsSubscribed(true);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Push subscription error:', err);
      setLoading(false);
      return false;
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;

        if (token) {
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/manage-push?action=unsubscribe`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ endpoint }),
            }
          );
        }
      }

      setIsSubscribed(false);
    } catch (err) {
      console.error('Push unsubscribe error:', err);
    }
    setLoading(false);
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
  };
}
