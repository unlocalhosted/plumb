export default {
  source: ['src/**/*.{css,tsx}'],
  habits: ['hover-gate', 'focus-outline', 'transition-named', 'no-ease-in', 'logical-inline', 'viewport-dynamic', 'safe-area-fallback', 'overflow-clip', 'overscroll-contain',
    { id: 'no-fixed-heights-on-text', when: { prop: 'height', value: '^12px$', ownerElements: ['p'] }, message: 'Text must grow with its content.', severity: 'warn' },
    { id: 'pseudo-media', when: { prop: 'color', value: '^red$', origin: 'stylesheet', owner: { kind: 'element', name: '.ungated*' }, when: { has: { pseudo: ':hover', selector: 'ungated' }, lacks: { media: 'pointer' } } }, message: 'Custom predicate matched.', severity: 'info' }],
};
