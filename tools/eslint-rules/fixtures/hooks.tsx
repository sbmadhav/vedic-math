// Expect: react-hooks/rules-of-hooks
import { useState } from 'react';
export function Counter({ on }: { on: boolean }) {
  if (on) {
    const [n] = useState(0);
    return <p>{n}</p>;
  }
  return null;
}
