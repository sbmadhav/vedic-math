// Expect: lvm/server-safe x4, react-hooks/purity x1 (module level, the render, Date.now() in the render, a memo
// component; the React Compiler's purity rule also refuses Date.now() in a render)
import { memo } from 'react';
const saved = localStorage.getItem('vm.players');
export function Greeting() {
  const theme = document.documentElement.dataset.theme;
  const at = Date.now();
  return <p data-theme={theme} data-at={at}>{saved}</p>;
}
export const Clock = memo(function Clock() {
  return <time>{window.location.hash}</time>;
});
