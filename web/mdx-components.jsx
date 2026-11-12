// How the docs' Markdown is drawn: the site's own prose, in the visual language. Every MDX page gets these.
import { Callout, Family, Code, Pre, Heading } from './docs/prose.jsx';
import { Later } from './docs/Later.jsx';

export function useMDXComponents(components) {
  return {
    h2: (p) => <Heading as="h2" {...p} />,
    h3: (p) => <Heading as="h3" {...p} />,
    code: Code,
    pre: Pre,
    table: (p) => <div className="table"><table {...p} /></div>,
    Callout,
    Family,
    Recorded: ({ children }) => children ?? null,
    PlumbOverlay: () => <Later what="The live overlay" />,
    ...components,
  };
}
