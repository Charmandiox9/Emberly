import { useRootNavigationState, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useServices } from './services';

export function ReminderLifecycle(): null {
  const { reminders } = useServices();
  const router = useRouter();
  const rootKey = useRootNavigationState()?.key;
  useEffect(() => {
    if (!rootKey) return;
    let active = true;
    let stop: (() => void) | undefined;
    void reminders
      .observe(() => {
        if (!active) return false;
        router.navigate('/(tabs)');
        return true;
      })
      .then((unsubscribe) => {
        if (active) stop = unsubscribe;
        else unsubscribe();
      })
      .catch(() => {
        /* Missing native module must not block finances. */
      });
    const reconcile = (): void => {
      void reminders.read().catch(() => {
        /* Preferences remain persisted for the next retry. */
      });
    };
    reconcile();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') reconcile();
    });
    return () => {
      active = false;
      stop?.();
      subscription.remove();
    };
  }, [reminders, router, rootKey]);
  return null;
}
