// Expect: react/jsx-key (the React recommended rules run in app/src)
export function Names({ names }: { names: string[] }) {
  return <ul>{names.map(n => <li>{n}</li>)}</ul>;
}
