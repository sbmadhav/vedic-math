// Expect: react/no-danger
export function Note({ html }: { html: string }) {
  return <p dangerouslySetInnerHTML={{ __html: html }} />;
}
