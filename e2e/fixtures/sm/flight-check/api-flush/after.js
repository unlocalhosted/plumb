// overlay #16: the flush captures its run before the fetch and gives up if another flush started meanwhile.
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
  const run = ++flushRun;
  const body = JSON.stringify(queued);
  queued = [];
  const response = await fetch('/__plumb/batch', { method: 'POST', body });
  if (run !== flushRun) return;
  if (!response.ok) send('refused');
}
