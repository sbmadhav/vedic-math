// Expect: lvm/server-safe x8, react-hooks/purity x1 (module level, the render, Date.now() in the render, a memo
// component, a hook's body, a useState initializer, a useMemo callback, a map callback; the React Compiler's purity
// rule also refuses Date.now() in a render)
import { memo, useMemo, useState } from 'react';
const saved = localStorage.getItem('vm.players');
export function Greeting() {
  const theme = document.documentElement.dataset.theme;
  const at = Date.now();
  return <p data-theme={theme} data-at={at}>{saved}</p>;
}
export const Clock = memo(function Clock() {
  return <time>{window.location.hash}</time>;
});
export function useTheme() {
  return document.documentElement.dataset.theme;
}
export function List({ keys }: { keys: string[] }) {
  const [first] = useState(() => sessionStorage.getItem('first'));
  const width = useMemo(() => window.innerWidth, []);
  return <ul data-first={first} data-width={width}>{keys.map(k => <li key={k}>{localStorage.getItem(k)}</li>)}</ul>;
}
