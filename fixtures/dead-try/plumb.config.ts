export default {
  css: 'src/styles.css',
  source: ['src/**/*.{tsx,css}'],
  decisions: { spacing: { identity: 'value', callers: ['primitive', 'semantic'] }, color: { callers: ['semantic'] } },
};
