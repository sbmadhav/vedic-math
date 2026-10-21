// Expect: nothing (the allowed places for page globals and the time)
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
declare function ClientOnly(props: { children: () => ReactNode }): ReactNode;
/* A store hook: the browser's snapshot reads storage, the server's gives the same first value everywhere */
export function useSaved(key: string) {
  return useSyncExternalStore(
    onChange => { addEventListener('storage', onChange); return () => removeEventListener('storage', onChange); },
    () => localStorage.getItem(key),
    () => null,
  );
}
export const isBrowser = () => typeof window !== 'undefined';
export function Greeting() {
  useEffect(() => { document.title = `${document.documentElement.dataset.theme ?? 'light'} theme`; }, []);
  const onClick = () => { sessionStorage.setItem('tapped', String(Date.now())); };
  return (
    <button type="button" onClick={onClick}>
      <ClientOnly>{() => window.location.hash}</ClientOnly>
    </button>
  );
}
