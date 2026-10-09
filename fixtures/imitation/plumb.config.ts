export default {
  css: 'src/styles.css',
  source: ['src/**/*.{tsx,css}'],
  components: { from: 'directory:src/components/ui', own: [] },
  imitation: {
    Textarea: { fingerprint: ['kit-well', 'var(--kit-well-'] },
    Field: { elements: ['input'], fingerprint: ['kit-field-*'] },
  },
};
