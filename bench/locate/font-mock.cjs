// Next's own test hook (NEXT_FONT_GOOGLE_MOCKED_RESPONSES): answers every next/font/google request with a one-face
// stylesheet, so a dev server never goes to fonts.googleapis.com. The bench measures source location, not fonts.
module.exports = new Proxy({}, {
  get: (_, url) => (typeof url === 'string' && url.startsWith('http') ? `/* latin */\n@font-face {\n  font-family: 'BenchFont';\n  font-style: normal;\n  font-weight: 400;\n  font-display: swap;\n  src: url(https://fonts.gstatic.com/s/benchfont/v1/bench.woff2) format('woff2');\n  unicode-range: U+0000-00FF;\n}\n` : undefined),
});
