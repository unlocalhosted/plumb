import config from './plumb.config.ts';

// These are library-authored token sources, published beyond the docs tree.
// Leave docs-only variables visible to the unused-decision report.
export default { ...config, exported: ['tokens/tokens.json', 'packages/metalui/src/components/theme.css', 'packages/metalui/src/components/tokens.css'] };
