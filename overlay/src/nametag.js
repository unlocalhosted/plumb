// The name tag: the words that follow the pointer over your page, before anything is pinned. It names the element
// (by its component when it is one's outermost element, else its tag and where it is written) and says its state in
// one word. The widget (widget.js) puts this block back where it always stood in its stylesheet; the design site's
// "Words on hover" page draws the same tag from here.
export const NAME_TAG_CSS = `
  /* the hover tag: what the pointer is on, before anything is pinned */
  .tag { position: fixed; left: 0; top: 0; height: var(--pl-tag-h); display: flex; align-items: center; gap: 6px; padding-inline: 8px; white-space: nowrap;
         background: var(--pl-bg-surface); border-radius: var(--pl-radius-tag); box-shadow: var(--pl-shadow-tag); font: var(--pl-card-label);
         transition: transform var(--pl-dur-travel) var(--pl-spring), opacity var(--pl-dur-feedback) var(--pl-ease-out); }
  .tag .el, .top .el { font-weight: 600; color: var(--pl-text-primary); }
  .tag .who, .top .who { color: var(--pl-text-secondary); font-weight: 500; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .tag .n, .top .n, .top .el, .top .zoom, .top .close { flex: none; }
  .tag .n, .top .n { font: var(--pl-card-code); font-variant-numeric: tabular-nums; color: var(--pl-off); }
  .n.ok { color: var(--pl-on); } .n.quiet { color: var(--pl-text-secondary); }
  .tag .path { display: inline-flex; align-items: center; gap: 4px; color: var(--pl-text-secondary); font-weight: 500; }
  .tag .path .here { color: var(--pl-text-primary); font-weight: 600; }
  .tag .path .cmp { color: var(--pl-instrument); }
  .tag .path .sep, .tag .path .more { color: var(--pl-icon-tick); }`;
