// overlay #16: once the server refuses a batch a restarted server takes it home.
/** @machine */
export const BATCHER = {
  id: 'api-batcher', owner: 'module', field: 'mode', token: 'run', send: 'send', initial: 'batched',
  states: {
    batched: { on: { refused: 'direct' } },
    direct:  { on: { refused: 'direct', serverRestarted: 'batched' } },
  },
};
let mode = BATCHER.initial;
let run = 0;
function send(event) {
  const next = BATCHER.states[mode]?.on?.[event];
  if (next) mode = next;
  return !!next;
}
export function refuse() { return send('refused'); }
