// overlay #16: a refused batch flips the module after the fetch, whether or not that flush is still the current one.
/** @machine */
export const BATCHER = {
  id: 'api-batcher', owner: 'module', field: 'mode', token: 'flushRun', send: 'send', initial: 'batched',
  states: {
    batched: { on: { refused: 'direct' } },
    direct:  { on: { serverRestarted: 'batched' } },
  },
};
let mode = BATCHER.initial;
let flushRun = 0;
let queued = [];
function send(event) {
  const next = BATCHER.states[mode]?.on?.[event];
  if (next) mode = next;
  return !!next;
}
export function queue(call) { queued.push(call); }
export async function flush() {
  const body = JSON.stringify(queued);
  queued = [];
  const response = await fetch('/__plumb/batch', { method: 'POST', body });
  if (!response.ok) send('refused');
}
