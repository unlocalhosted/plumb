export default {
  "css": "src/theme.css",
  "source": ["src/**/*.{tsx,jsx,ts,js,css}"],
  "decisions": {
    "spacing": { "inferred": true, "from": ["css:src/theme.css#--spacing-*"] },
    "color": { "inferred": true, "from": ["css:src/theme.css#--color-*"] },
    "type": { "inferred": true, "from": ["css:src/theme.css#--font-*", "css:src/theme.css#--text-*"] },
    "radius": { "inferred": true, "from": ["css:src/theme.css#--radius-*"] }
  },
  "habits": []
};
