// Inferred by React Plumber. Review token sources and habits with the design owner.
// Components: 0 found.
export default {
  "css": "src/theme.css",
  "source": [
    "src/**/*.{tsx,jsx,ts,js,css}",
    "app/**/*.{tsx,jsx,ts,js,css}"
  ],
  "decisions": {
    "color": {
      "inferred": true,
      "from": [
        "css:src/theme.css#--color-*"
      ]
    },
    "type": {
      "inferred": true,
      "from": [
        "css:src/theme.css#--font-*",
        "css:src/theme.css#--text-*"
      ]
    },
    "spacing": {
      "inferred": true,
      "from": [
        "css:src/theme.css#--spacing-*"
      ]
    },
    "size": {
      "inferred": true,
      "from": [
        "css:src/theme.css#--container-*",
        "css:src/theme.css#--breakpoint-*"
      ]
    },
    "radius": {
      "inferred": true,
      "from": [
        "css:src/theme.css#--radius-*"
      ]
    },
    "elevation": {
      "inferred": true,
      "from": [
        "css:src/theme.css#--shadow-*"
      ]
    },
    "motion": {
      "inferred": true,
      "from": [
        "css:src/theme.css#--ease-*",
        "css:src/theme.css#--duration-*",
        "css:src/tokens.css#--pl-dur-dim",
        "css:src/tokens.css#--pl-dur-drop",
        "css:src/tokens.css#--pl-dur-undim"
      ]
    }
  },
  "habits": [
    "hover-gate", // 0 breaks
    "focus-outline", // 0 breaks
    "transition-named", // 0 breaks
    "no-ease-in", // 0 breaks
    // "logical-inline", // 12 breaks
    // "viewport-dynamic", // 1 breaks
    // "safe-area-fallback", // 0 breaks
    // "overflow-clip", // 10 breaks
    // "overscroll-contain", // 1 breaks
    // "tracking-em", // 0 breaks
    // "composited-motion", // 3 breaks
    // "reduced-motion-fade", // 1 breaks
    // "font-metrics", // 0 breaks
    // "real-quotes", // 0 breaks
    // "color-scheme", // 0 breaks
  ]
};
