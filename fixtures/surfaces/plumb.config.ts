export default {
  css: 'src/styles.css',
  decisions: { spacing: { from: 'theme:--spacing-step-*', identity: 'value' } },
  habits: [{ id: 'team-spacing', when: { prop: 'text-indent' }, message: 'Keep related parts together.' }],
};
