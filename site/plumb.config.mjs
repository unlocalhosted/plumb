// The manual's finite spacing ladder, small steps for parts and large ones for layout. Tailwind's unrestricted half-step ladder would offer p-5.5 for 22px,
// preserving the drift instead of fitting it to the documented 24px card padding.
export default {
  decisions: { spacing: { callers: ['primitive', 'semantic'], from: () =>
    [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 24, 32].map(step => ({
      family: 'spacing', name: `--spacing-${step}`, value: `calc(var(--spacing) * ${step})`,
      resolved: `${step * 4}px`, refs: [`calc(var(--spacing) * ${step})`], origin: 'project', tier: 'primitive',
      why: { 3: 'related parts and compact controls', 6: 'card padding', 10: 'between a figure and its text', 16: 'the sheet margin', 24: 'between sections', 32: 'before the close' }[step] ?? 'manual spacing ladder',
      source: { file: 'src/styles.css', line: 1 },
    })) } },
};
