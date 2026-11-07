// overlay #17: the source map reader falls back for good; `fallback` is declared final, so the decision is visible.
/** @machine */
export const SOURCEMAP = {
  id: 'sourcemap', owner: 'SourceMap', field: '#mode', initial: 'mapped',
  states: {
    mapped:   { on: { failed: 'fallback' } },
    fallback: { final: true },
  },
};
export class SourceMap {
  #mode = SOURCEMAP.initial;
  #send(event) {
    const next = SOURCEMAP.states[this.#mode]?.on?.[event];
    if (next) this.#mode = next;
    return !!next;
  }
  fail() { return this.#send('failed'); }
}
