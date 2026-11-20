// What Plumber checks (docs): an overview of the six concerns, and a page for each, read from the rule sources
// (web/scripts/checks.mjs → recordings/checks.json). A check opens to what it catches and how Plumber fixes it, and
// where a fix moves a value, the change plays with the same motion Clean up uses (overlay/src/show-motion.js).
import data from './recordings/checks.json';
import { tokenFile } from '../site/tokens.js';
import { OverviewGrid, ConcernGrid } from './checks-client.jsx';

export const CheckCount = () => <>{data.checks.length}</>;
export const Overview = () => <OverviewGrid data={data} />;
export async function ConcernPage({ id }) {
  const css = await tokenFile();
  return <ConcernGrid css={css} concern={data.concerns.find((c) => c.id === id)} checks={data.checks.filter((c) => c.concern === id)} />;
}
