// engine #1: the flight is captured before the await; a restore that is no longer current is skipped.
import type { Machine } from '../../../../tools/sm/types.js';

/** @machine */
export const ENGINE: Machine = {
  id: 'engine-traced', owner: 'Engine', field: 'phase', token: 'flight', send: 'send', initial: 'idle',
  states: {
    idle:     { on: { apply: 'applying' } },
    applying: { flight: 'apply', on: { applied: 'idle', failed: 'idle' } },
  },
  flights: { apply: { ifLeft: 'drop' } },
};

export class Engine {
  private phase: string = ENGINE.initial;
  private flight = 0;
  private tag = '';
  private send(event: string): boolean {
    const next = ENGINE.states[this.phase]?.on?.[event];
    if (next) this.phase = next;
    return !!next;
  }
  async traced<T>(tag: string, fn: (...args: unknown[]) => Promise<T>, ...args: unknown[]): Promise<T> {
    const previous = this.tag;
    this.tag = tag;
    const flight = ++this.flight;
    try {
      return await fn.apply(this, args);
    } finally {
      if (flight !== this.flight) return;
      this.tag = previous;
    }
  }
}
