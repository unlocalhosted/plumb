import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../', import.meta.url));
export async function reportFixture(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.report-e2e-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'src/pages'), { recursive: true });
  await writeFile(join(root, 'package.json'), '{"name":"algorecall-shaped","type":"module"}');
  await writeFile(join(root, 'plumber.config.ts'), `export default {
    css: 'src/styles.css', components: { from: 'src/Control.tsx' },
    decisions: { spacing: { from: 'theme:--spacing-*' } }
  };`);
  await writeFile(join(root, 'src/styles.css'), `@import "tailwindcss";
    @theme { --spacing: 1px; --spacing-small: 8px; --spacing-large: 12px;
      --color-brand: #123456; --radius-control: 12px; --text-body: 16px;
      --duration-quick: 120ms; --ease-snap: cubic-bezier(.2,0,.2,1);
      --shadow-float: 0 2px 4px var(--color-brand); }
    .broken { color: var(--undefined-paint); }
    .gap { z-index: 31; }
  `);
  await writeFile(join(root, 'src/Control.tsx'), 'export const Control = ({className}) => <button className={`bg-brand rounded-control ${className}`} />;');
  for (let i = 0; i < 32; i++) {
    await writeFile(join(root, `src/pages/Page${i}.tsx`), `import '../styles.css';
import { Control } from '../Control';
export const Page${i} = () => <>
  <Control className="bg-[#abcdef]" />
  <div className="missing-class p-[13px] rounded-[13px] text-xs font-mono leading-relaxed text-sm duration-[321ms] shadow-[0_3px_7px_#000]" style={{fontSize:${101 + i},padding:13,color:'#abcdef',left:measured}} />
</>;`);
  }
  return root;
}
