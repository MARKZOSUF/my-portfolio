import { useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/services/api/client';
import { API } from '@/constants/config';
import { usePreferencesStore } from '@/store/preferences';
import { tokenStore } from '@/services/auth/tokenStore';
import { useNotifications } from '@/hooks/useNotifications';

export interface ProfilePayload {
  id: string;
  email: string;
  displayName: string;
  subjects: string[];
  dailyMinutes: number;
}

/** Bundles the account, preference and privacy actions the settings screen needs. */
export function useSettings() {
  const preferences = usePreferencesStore();
  const notifications = useNotifications();

  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<ProfilePayload>(API.users.me),
    staleTime: 300_000,
  });

  const updateProfile = useMutation({
    mutationFn: (input: Partial<Pick<ProfilePayload, 'displayName' | 'subjects' | 'dailyMinutes'>>) =>
      api.patch<ProfilePayload>(API.users.profile, {
        display_name: input.displayName,
        subjects: input.subjects,
        daily_minutes: input.dailyMinutes,
      }),
  });

  const exportData = useMutation({
    mutationFn: () => api.post<{ task_id: string }>(API.privacy.export, {}),
  });

  const deleteAccount = useMutation({
    mutationFn: (confirmation: string) => api.post<void>(API.privacy.delete, { confirmation }),
  });

  const signOut = useCallback(async () => {
    try {
      await api.post(API.auth.logout, {});
    } finally {
      await tokenStore.clear();
      await notifications.cancelAll();
    }
  }, [notifications]);

  return { profile, updateProfile, exportData, deleteAccount, signOut, preferences, notifications };
}
