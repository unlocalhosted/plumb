import { defineConfig, defineDecisions } from '../../dist/index.js';
export default defineConfig({ decisions: { spacing: { from: () => defineDecisions([
  { family: 'spacing', name: '--space-related', value: '12px', why: 'preset related parts', source: { file: import.meta.filename, line: 4 } },
  { family: 'spacing', name: '--space-group', value: '16px', why: 'preset separate groups', source: { file: import.meta.filename, line: 5 } },
]) } } });
