// The five pricing cards of layer 1, chosen to differ in structure. Each says where its card is and which element does
// which job. Picks run in the page; `find(root, re)` is the smallest visible element whose text matches,
// `all(root, sel)` is every visible match, `biggest(root)` is the line holding the largest text (a price).
export const sites = [
  {
    id: 'linear-basic', url: 'https://linear.app/pricing',
    root: `[...document.querySelectorAll('section')].find((s) => s.className.includes('card') && /\\bBasic\\b/.test(s.innerText))`,
    slots: `({ identity: find(root, /^Basic$/), price: find(root, /^\\$\\d+ per user\\/month$/), input: find(root, /^Billed yearly$/), proof: all(root, 'ul li'), action: find(root, /^Get started$/) })`,
    body: `all(root, 'ul li')[1]`,
  },
  {
    id: 'supabase-pro', url: 'https://supabase.com/pricing',
    root: `cardAround(find(document.body, /^Most Popular$/))`,
    slots: `({ identity: find(root, /^PRO$/i), status: find(root, /^Most Popular$/), meta: find(root, /^For production applications/), action: find(root, /^Get Started$/), price: biggest(root), help: find(root, /^First project included/), proof: all(root, 'ul li') })`,
    body: `all(root, 'ul li')[1]`,
  },
  {
    id: 'uiarc-lifetime', url: 'https://uiarc.dev/pricing',
    root: `cardAround(find(document.body, /^Pay once, keep it forever$/))`,
    slots: `({ status: find(root, /^Lifetime$/), identity: find(root, /^Pay once, keep it forever$/), price: biggest(root), meta: find(root, /^Every future Pro release, no renewal$/), proof: all(root, 'ul li'), action: find(root, /^Get lifetime/) })`,
    body: `all(root, 'ul li')[1]`,
  },
  {
    id: 'uiarc-free', url: 'https://uiarc.dev/pricing',
    root: `cardAround(find(document.body, /^The open core/))`,
    slots: `({ media: root.querySelector('svg'), identity: find(root, /^Free$/), price: find(root, /^\\$0 forever$/), meta: find(root, /^The open core/), action: find(root, /^Browse components/) })`,
    body: `find(root, /^The open core/)`,
  },
  {
    id: 'bencho-forever', url: 'https://bencho.dev/pricing',
    root: `cardAround(find(document.body, /^Best value$/))`,
    slots: `({ identity: find(root, /^Forever$/), status: find(root, /^Best value$/), price: biggest(root), proof: all(root, 'ul li'), action: find(root, /^Get Pro forever$/), help: find(root, /^Pay once/) })`,
    body: `all(root, 'ul li')[1]`,
  },
  {
    // a house section: one of the owner's own products, as shipped (craftingattention.com, the home page's pricing)
    id: 'craftingattention-lifetime', url: 'https://craftingattention.com/', house: true,
    root: `document.querySelector('#pricing .lifetime-offer')`,
    slots: `({ meta: find(root, /^CraftingAttention$/), identity: find(root, /^Lifetime access$/), value: find(root, /^For the ones who build\.$/), price: biggest(root), media: root.querySelector('svg.lifetime-art'), help: find(root, /^India purchase parity/), action: find(root, /^Get Lifetime Access/), proof: find(root, /^Instant lifetime access/) })`,
    body: `find(root, /^India purchase parity/)`,
  },
];

// In-page helpers, injected before a site's picks run.
export const helpers = `
const visible = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.opacity !== '0'; };
const find = (root, re) => { const hits = [...root.querySelectorAll('*')].filter((e) => visible(e) && re.test((e.innerText || '').trim())); return hits.sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length)[0] || null; };
const all = (root, sel) => [...root.querySelectorAll(sel)].filter(visible);
const cardAround = (el) => { let p = el; while (p.parentElement && p.parentElement.getBoundingClientRect().height < 1100 && p.parentElement.getBoundingClientRect().width < 700) p = p.parentElement; return p; };
const biggest = (root) => { const leaves = [...root.querySelectorAll('*')].filter((e) => visible(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())); const top = leaves.sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize))[0]; let p = top; while (p.parentElement && p.parentElement.getBoundingClientRect().height < top.getBoundingClientRect().height * 1.6) p = p.parentElement; return p; };
`;
