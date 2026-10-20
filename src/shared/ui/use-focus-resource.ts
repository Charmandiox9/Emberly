import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

interface Loading {
  readonly status: 'loading';
}
interface Ready<T> {
  readonly status: 'ready';
  readonly data: T;
  readonly key: string;
  readonly revision: number;
}
interface Failed {
  readonly status: 'error';
  readonly key: string;
  readonly revision: number;
}
export type ResourceState<T> = Loading | Ready<T> | Failed;
interface FocusResource<T> {
  readonly state: ResourceState<T>;
  readonly reload: () => void;
}
export function useFocusResource<T>(read: () => Promise<T>, key: string): FocusResource<T> {
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void Promise.resolve()
        .then(read)
        .then(
          (data) => {
            if (active) setState({ status: 'ready', key, revision, data });
          },
          () => {
            if (active) setState({ status: 'error', key, revision });
          },
        );
      return () => {
        active = false;
      };
    }, [read, key, revision]),
  );
  return {
    state:
      state.status !== 'loading' && (state.key !== key || state.revision !== revision)
        ? { status: 'loading' }
        : state,
    reload: () => setRevision((value) => value + 1),
  };
}
