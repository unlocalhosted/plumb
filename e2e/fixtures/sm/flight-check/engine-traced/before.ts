// engine #1: traced() restores the previous tag in a finally; with overlapping calls the restores land LIFO on the wrong run.
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
    try {
      return await fn.apply(this, args);
    } finally {
      this.tag = previous;
    }
  }
}
