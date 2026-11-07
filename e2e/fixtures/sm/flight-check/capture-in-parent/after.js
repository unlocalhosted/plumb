// The token is captured in the method and tested in its .then callback: that is a guard, and nothing is reported.
/** @machine */
export const MARKS = {
  id: 'marks', owner: 'Marks', field: '#phase', token: '#run', initial: 'idle',
  states: {
    idle:    { on: { scan: 'scanning' } },
    scanning: { flight: 'read', on: { landed: 'idle', stop: 'idle' } },
  },
  flights: { read: { ifLeft: 'drop' } },
};
export class Marks {
  #host;
  #phase = MARKS.initial;
  #run = 0;
  #marks = null;
  #count = 0;
  constructor(host) { this.#host = host; }
  #send(event) {
    const next = MARKS.states[this.#phase]?.on?.[event];
    if (next) this.#phase = next;
    return !!next;
  }
  scan(item) {
    if (!this.#send('scan')) return;
    const run = ++this.#run;
    this.#host.readMarks(item.el).then((state) => {
      if (run !== this.#run) return;
      this.#marks = state;
      this.#send('landed');
    });
  }
  async count(items) {
    const flight = ++this.#run;
    for (const item of items) {
      const n = await this.#host.count(item);
      if (flight === this.#run) { this.#count += n; }
    }
    if (this.#run !== flight || !items.length) return;
    this.#count = items.length;
  }
  stop() { this.#run++; this.#send('stop'); }
}
