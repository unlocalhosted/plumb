export default {
  css: "src/styles.css", source: ["src/**/*.{ts,tsx}", "src/styles.css"],
  decisions: { spacing: { callers: ["primitive", "semantic"] } },
  classHelpers: [
    'joinStyles',
    { name: 'makeRecipe', args: 'config', configKeys: ['classes', 'variants', 'compoundVariants', 'className'] },
    { name: 'mixedRecipe', args: 'classes', configFrom: 1, configKeys: ['classes'] },
  ],
};
