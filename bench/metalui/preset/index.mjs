import { definePreset, defineDecisions } from '@unlocalhosted/react-plumber';
import decisions from './decisions.json' with { type: 'json' };
import metadata from './metadata.json' with { type: 'json' };

// Move this directory to packages/metalui/plumb and publish the ./plumb export.
export default definePreset({
  components: metadata.components, imitation: metadata.imitation, habits: metadata.habits, markers: metadata.markers,
  name: '@unlocalhosted/metalui',
  decisions: Object.fromEntries(Object.entries(metadata.decisions).map(([family, policy]) => [family, {
    ...policy, from: () => defineDecisions(decisions.filter(record => record.family === family)),
  }])),
  exported: true,
});
