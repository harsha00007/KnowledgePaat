"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { UserAccess, getUserAccess, calculateUserAccess } from '@/lib/subscription';

export function useSubscription() {
  const [access, setAccess] = useState<UserAccess>(calculateUserAccess(null));
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    async function loadSubscription() {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const userAccess = await getUserAccess(supabase, user.id);
          if (isMounted) setAccess(userAccess);
        }
      } catch (err) {
        console.error('Failed to load subscription in hook:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSubscription();

    return () => {
      isMounted = false;
    };
  }, []);

  return { access, isLoading };
}
