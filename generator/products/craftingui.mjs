// crafting-ui, as the generator needs to know it: the organism it varies is the wall of live lessons on the home page
// (src/pages/home/Wall.tsx): a row of gesture stickers, the count of live lessons, arrows that page the row.
export const product = {
  id: 'craftingui',
  name: 'crafting-ui',
  root: '/Users/vijaysingh/unlocalhosted/crafting-ui',
  tokens: ['src/index.css'],
  wrapper: '', mode: 'light',
  organism: { specimen: 'craftingui-lesson-tile', component: 'src/pages/home/Wall.tsx', card: '.pg-organism', name: 'the wall of live lessons', looks: { navigation: { inherit: true } },
    keep: { media: 'the gesture stickers are the product’s own drawings; no library part says what a gesture looks like' },
    slots: { navigation: 'live-count', media: 'gesture-sticker' } },
  content: {
    'a number that changes': true,   // lessons live out of the total (content/registry liveCount, totalCount)
    'ordered stages': false, 'two billing periods': false, 'people': false, 'a data series': false, 'several plans': false,
  },
};
