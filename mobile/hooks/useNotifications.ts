import { useCallback, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { requestNotifications, scheduleRevision } from '@/services/notifications';

export interface NotificationsController {
  granted: boolean;
  checking: boolean;
  request: () => Promise<boolean>;
  scheduleRevisionReminder: (title: string, at: Date) => Promise<string | undefined>;
  cancelAll: () => Promise<void>;
}

/** Permission state plus the reminder scheduling the revision screen needs. */
export function useNotifications(): NotificationsController {
  const [granted, setGranted] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    void Notifications.getPermissionsAsync().then((p) => {
      if (!active) return;
      setGranted(p.status === 'granted');
      setChecking(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const request = useCallback(async () => {
    const ok = await requestNotifications();
    setGranted(ok);
    return ok;
  }, []);

  const scheduleRevisionReminder = useCallback(
    async (title: string, at: Date) => {
      if (!granted && !(await request())) return undefined;
      return scheduleRevision(title, at);
    },
    [granted, request],
  );

  const cancelAll = useCallback(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }, []);

  return { granted, checking, request, scheduleRevisionReminder, cancelAll };
}
