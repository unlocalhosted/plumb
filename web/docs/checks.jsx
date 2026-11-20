// What Plumber checks (docs page): every check, by concern, read from the rule sources (web/scripts/checks.mjs →
// recordings/checks.json). Each one opens to say what it catches and how Plumber fixes it, and where a fix moves a
// value, the change plays with the same motion Clean up uses (overlay/src/show-motion.js).
import data from './recordings/checks.json';
import { tokenFile } from '../site/tokens.js';
import { ChecksClient } from './checks-client.jsx';

export async function Checks() {
  const css = await tokenFile();
  return <ChecksClient css={css} data={data} />;
}
export const CheckCount = () => <>{data.checks.length}</>;
