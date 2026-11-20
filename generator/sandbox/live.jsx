// The live catalogue's page: only the parts that passed stage 3's bar (live-parts.generated.js, written by
// live-build.mjs), so one part's missing import can't break the build.
import { mount } from './stage.jsx';
import { PARTS } from './live-parts.generated.js';
mount(PARTS[new URLSearchParams(location.search).get('part')]);
