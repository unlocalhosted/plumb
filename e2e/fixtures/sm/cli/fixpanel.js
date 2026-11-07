// The fix panel as spec 1.1 declares it, on a cut-down owner with the canonical #send and flight (spec 2.2, 2.3).
/** @machine */
export const FIX_PANEL = {
  id: 'fix-panel',
  owner: 'FixPanel',
  field: '#phase',
  token: '#flight',
  initial: 'closed',
  cancel: ['escape', 'close', 'unmount'],
  states: {
    closed:  { on: { open: 'resting', openWriting: 'writing', openUndoing: 'undoing' }, ignores: ['escape', 'close', 'unmount'] },
    resting: { on: { hold: 'holding', undo: 'undoing', close: 'closed', escape: 'closed', unmount: 'closed' } },
    holding: { on: { take: 'writing', keep: 'keeping', release: 'resting', hold: 'holding', undo: 'undoing', escape: 'resting', close: 'closed', unmount: 'closed' } },
    keeping: { on: { keepIt: 'writing', closeKeep: 'holding', release: 'resting', undo: 'undoing', escape: 'holding', close: 'closed', unmount: 'closed' } },
    writing: { flight: 'write', on: { landedNext: 'holding', landedNone: 'resting', close: 'closed', unmount: 'closed' }, ignores: ['escape'] },
    undoing: { flight: 'undo', on: { landed: 'resting', close: 'closed', unmount: 'closed' }, ignores: ['escape'] },
  },
  flights: {
    write: { ifLeft: 'handOff' },
    undo: { ifLeft: 'drop' },
  },
};

export class FixPanel {
  #host;
  #phase = FIX_PANEL.initial;
  #flight = null;
  constructor(host) { this.#host = host; }
  #send(event) {
    const next = FIX_PANEL.states[this.#phase]?.on?.[event];
    if (next) this.#phase = next;
    return !!next;
  }
  key(k) {
    if (k === 'Escape') return this.#send('escape');
    return false;
  }
  open() { return this.#send('open'); }
  close() { this.#send('close'); }
  async #write(said) {
    if (!this.#send('take')) return;
    const flight = (this.#flight = {});
    let left;
    try { left = await this.#host.applyAll(said); } catch (error) { left = { count: 1, why: error?.message }; }
    if (this.#flight !== flight) {
      this.#host.handOff?.(left);
      return;
    }
    this.#flight = null;
    this.#send(left.count ? 'landedNone' : 'landedNext');
  }
  take(said) { return this.#write(said); }
}
