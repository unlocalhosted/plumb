// React Plumber, as the generator needs to know it: its own section as shipped on craftingui.com
// (crafting-ui src/pages/home/Plumber.tsx): the name, three steps, the install line, and the site's own report.
export const product = {
  id: 'plumber',
  name: 'React Plumber',
  // what the product is for, in a sentence: the words its buttons mean inside it
  about: 'a design-review tool for React apps: install it, then it checks the page against your design tokens',
  root: '/Users/vijaysingh/unlocalhosted/crafting-ui',
  tokens: ['src/index.css'],
  wrapper: '', mode: 'light',
  organism: { specimen: 'plumber-companion', component: 'src/pages/home/Plumber.tsx', card: '.pg-organism', name: 'its section on craftingui.com', looks: { value: { inherit: true } },
    slots: { action: 'install-strip', value: 'spirit-level', proof: 'step' } },
  // its atoms: the Copy button on the install line, one press that says it has copied
  atoms: [
    { id: 'copy', name: 'the Copy button on the install line', job: 'commit', pick: 'button[aria-label="Copy the install command"]', label: 'Copy', doneLabel: 'Copied', readyLabel: 'Copied ✓',
      is: 'A small blue button at the end of the install command: pressing it copies the command and says Copied for a moment.' },
  ],
  content: {
    'a number that changes': true,   // each family's share on its tokens, counted up on view
    'ordered stages': true,           // check, see, fix: three steps in order
    'two billing periods': false, 'people': false,
    'a data series': false,           // seven shares, one per family: a set, not a series over time
    'several plans': false,
  },
};
