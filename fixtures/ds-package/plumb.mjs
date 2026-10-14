import { definePreset } from '@unlocalhosted/react-plumber';
export default definePreset({
  name: '@fixtures/design-system',
  decisions: [
    { family: 'color', name: '--color-ds-canvas', value: '#334455', source: { file: 'src/theme.css', line: 2 } },
    { family: 'color', name: '--color-ds-danger', value: '#bb3344', source: { file: 'src/theme.css', line: 3 } },
    { family: 'spacing', name: '--spacing-ds-gap', value: '12px', source: { file: 'src/theme.css', line: 4 } },
  ],
  components: { from: 'package:@fixtures/design-system', contracts: { Button: { allow: ['padding'], deny: ['margin'] } } },
  imitation: { Textarea: { elements: ['textarea'], fingerprint: ['ds-field'] } },
  habits: ['hover-gate'],
  markers: ['ds-button'],
});
