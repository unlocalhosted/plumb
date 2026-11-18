// Crisp shots of the slop dashboard sample at its first and last step (/sample/slop), for the owner to judge the look.
//   node overlay/showcase/scripts/sample-shots.mjs   → docs/films/slop-before.png, slop-after.png
import { chromium } from 'playwright';

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1900, height: 1150 }, deviceScaleFactor: 2 });
await pg.goto('http://localhost:4313/sample/slop');
await pg.waitForTimeout(1500);
const steps = await pg.$$('#root > div > div');
await steps[0].screenshot({ path: 'docs/films/slop-before.png' });
await steps[5].screenshot({ path: 'docs/films/slop-after.png' });
await b.close();
