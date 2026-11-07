// Spec 2.4: the TypeScript owner with the annotation form and the canonical send.
import { EventEmitter } from 'node:events';
import type { Machine } from '../../../../tools/sm/types.js';

/** @machine */
export const SESSION: Machine = {
  id: 'session-worker', owner: 'Session', field: 'worker', token: 'flight', initial: 'created',
  cancel: ['close'],
  states: {
    created:    { on: { start: 'starting', close: 'closed' } },
    starting:   { flight: 'spawn', on: { ready: 'ready', failed: 'invalid', close: 'closed' } },
    ready:      { on: { died: 'dead', restart: 'restarting', close: 'closed' } },
    restarting: { flight: 'spawn', on: { ready: 'ready', failed: 'invalid', close: 'closed' } },
    dead:       { on: { restart: 'restarting', close: 'closed' } },
    invalid:    { on: { changed: 'restarting', close: 'closed' } },
    closed:     { final: true },
  },
  flights: { spawn: { ifLeft: 'drop' } },
};

export class Session extends EventEmitter {
  private worker: string = SESSION.initial;
  private flight: object | null = null;
  private send(event: string): boolean {
    const next = SESSION.states[this.worker]?.on?.[event];
    if (next) this.worker = next;
    return !!next;
  }
  start(): boolean { return this.send('start'); }
  close(): void { this.send('close'); }
}
