// Next's own test hook (NEXT_FONT_GOOGLE_MOCKED_RESPONSES): answers next/font/google requests with a one-face
// stylesheet, so a dev server never goes to fonts.googleapis.com. The bench measures source location, not fonts.
// webpack asks the module for any URL (the Proxy answers); Turbopack serialises the module, so the URLs the corpus apps
// ask for are also listed as plain keys.
const css = `/* latin */\n@font-face {\n  font-family: 'BenchFont';\n  font-style: normal;\n  font-weight: 400;\n  font-display: swap;\n  src: url(https://fonts.gstatic.com/s/benchfont/v1/bench.woff2) format('woff2');\n  unicode-range: U+0000-00FF;\n}\n`;
const known = {};
for (const family of ['Geist:wght@100..900', 'Geist+Mono:wght@400', 'Inter:wght@100..900']) known[`https://fonts.googleapis.com/css2?family=${family}&display=swap`] = css;
module.exports = new Proxy(known, { get: (target, url) => (typeof url === 'string' && url.startsWith('http') ? css : target[url]) });
