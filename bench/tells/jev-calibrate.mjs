// Scores the labelled pairs with Jev, the way the dev server asks it (src/meaning.ts).
//   PLUMBER_JEV_KEY=… node bench/tells/jev-calibrate.mjs      (after npm run build)
import { judgePairs, JEV_CUT } from '../../dist/meaning.js';
import { CALIB, HELD } from './meaning-pairs.mjs';

if (!process.env.PLUMBER_JEV_KEY) { console.error('Set PLUMBER_JEV_KEY.'); process.exit(2); }
for (const [name, set] of [['calibration', CALIB], ['held out', HELD]]) {
  const a = await judgePairs(set.map(([, heading, line]) => ({ heading, line })), undefined);
  if (a.off) { console.error(name, 'off:', a.why); process.exit(1); }
  const tally = { tp: 0, fp: 0, fn: 0, tn: 0 };
  set.forEach(([label, h, s], i) => {
    const said = a.said[i];
    tally[said ? (label === 'R' ? 'tp' : 'fp') : (label === 'R' ? 'fn' : 'tn')]++;
    console.log(`  ${said === (label === 'R') ? '  ' : '✗ '}${label} ${a.similarity[i].toFixed(2)} ${h} | ${s}`);
  });
  console.log(name, tally, 'cut', JEV_CUT);
}
