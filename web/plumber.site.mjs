// What Plumber reads and may write while it runs on this site in development (app/%5F_plumb's route). Its root is
// the repository, because the site's pages are in web/ and its homepage's sections are in homepage/. The theme and
// the rules are the homepage's own (homepage/plumber.config.ts), with their paths taken from that root.
export default {
  css: 'homepage/src/theme.css',
  source: ['homepage/src/**/*.{tsx,jsx,ts,js,css}', 'web/{app,site,design,docs}/**/*.{tsx,jsx,ts,js,css}'],
  decisions: {
    color: { from: ['css:homepage/src/theme.css#--color-*'] },
    type: { from: ['css:homepage/src/theme.css#--font-*', 'css:homepage/src/theme.css#--text-*'] },
    spacing: { from: ['css:homepage/src/theme.css#--spacing-*'] },
    radius: { from: ['css:homepage/src/theme.css#--radius-*'] },
    elevation: { from: ['css:homepage/src/theme.css#--shadow-*'] },
    motion: { from: ['css:homepage/src/theme.css#--ease-*', 'css:homepage/src/theme.css#--duration-*'] },
  },
  habits: ['hover-gate', 'focus-outline', 'transition-named', 'no-ease-in'],
};
