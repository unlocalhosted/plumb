export default {
  css: 'src/styles.css',
  decisions: { spacing: { from: 'theme:--spacing-step-*', identity: 'value' } },
  habits: [{ id: 'team-spacing', when: { prop: 'gap' }, message: 'Keep related parts together.' }],
};
