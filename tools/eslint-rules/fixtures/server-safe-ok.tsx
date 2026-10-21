// Expect: nothing (the allowed places for page globals and the time)
import { useEffect, type ReactNode } from 'react';
declare function ClientOnly(props: { children: () => ReactNode }): ReactNode;
export function useSaved(key: string) {
  return typeof window === 'undefined' ? null : localStorage.getItem(key);
}
export function Greeting() {
  useEffect(() => { document.title = `${document.documentElement.dataset.theme ?? 'light'} theme`; }, []);
  const onClick = () => { sessionStorage.setItem('tapped', String(Date.now())); };
  return (
    <button type="button" onClick={onClick}>
      <ClientOnly>{() => window.location.hash}</ClientOnly>
    </button>
  );
}
