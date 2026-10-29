import { parentPort, workerData } from 'node:worker_threads';
import { Session } from './engine.js';
import { errorMessage, UsageError } from '../errors.js';

interface Call { id: number; method: string; args: unknown[]; deadline: number; json?: boolean }
const port = parentPort!;
const errorDetails = (error: unknown) => ({ errorStack: error instanceof Error ? error.stack : undefined, usageError: error instanceof UsageError });
const queue: Call[] = [];
let running = false;
const read = (call: Call) => !['apply', 'applyText', 'applyTextAt', 'undo', 'set', 'swap', 'swaps', 'accept', 'propEdit', 'token', 'props', 'history', 'refresh', 'try'].includes(call.method);
try {
  const session = await Session.create(workerData);
  const snapshot = async () => ({ health: await session.health(), stats: session.stats });
  session.on('change', value => { void snapshot().then(state => port.postMessage({ event: 'change', value, ...state })); });
  session.on('diagnostic', error => { void snapshot().then(state => port.postMessage({ event: 'diagnostic', value: error, ...state })); });
  async function execute(call: Call) {
    if (Date.now() >= call.deadline) { port.postMessage({ id: call.id, busy: true }); return; }
    port.postMessage({ id: call.id, started: true });
    try {
      const method = session[call.method as keyof Session] as (...args: unknown[]) => Promise<unknown>;
      const result = await method.apply(session, call.args);
      port.postMessage({ id: call.id, result: call.json ? JSON.stringify(result) : result, ...await snapshot() });
    } catch (error) { port.postMessage({ id: call.id, error: errorMessage(error), ...errorDetails(error), ...await snapshot() }); }
  }
  async function drain() {
    if (running) return; running = true;
    try {
      while (queue.length) {
        const cohort = [queue.shift()!];
        if (!read(cohort[0]!)) { await execute(cohort[0]!); continue; }
        while (queue.length && read(queue[0]!)) cohort.push(queue.shift()!);
        const active = cohort.filter(call => {
          if (Date.now() < call.deadline) return true;
          port.postMessage({ id: call.id, busy: true }); return false;
        });
        if (!active.length) continue;
        const queries = new Map<number, string[] | undefined>();
        for (let i = active.length - 1; i >= 0; i--) {
          const call = active[i]!;
          try { queries.set(call.id, await session.readQuery(call.method, call.args)); }
          catch (error) { active.splice(i, 1); port.postMessage({ id: call.id, error: errorMessage(error), ...errorDetails(error) }); }
        }
        if (!active.length) continue;
        const query = [...queries.values()].some(paths => paths === undefined) ? undefined : [...new Set([...queries.values()].flatMap(paths => paths!))];
        try { await session.batch(query, async () => {
          for (let i = 0; i < active.length; i++) {
            while (active.length < 512 && queue.length && read(queue[0]!)) {
              const call = queue[0]!;
              let paths;
              try { paths = await session.readQuery(call.method, call.args); }
              catch (error) { queue.shift(); port.postMessage({ id: call.id, error: errorMessage(error), ...errorDetails(error) }); continue; }
              if (query !== undefined && (paths === undefined || !paths.every(path => query.includes(path)))) break;
              active.push(queue.shift()!);
            }
            await execute(active[i]!);
          }
        }); }
        catch (error) { for (const call of active) port.postMessage({ id: call.id, error: errorMessage(error), ...errorDetails(error), ...await snapshot() }); }
      }
    } finally { running = false; }
  }
  port.on('message', (call: Call) => {
    if (queue.length >= 512 || Date.now() >= call.deadline) { port.postMessage({ id: call.id, busy: true }); return; }
    queue.push(call); setImmediate(() => { void drain(); });
  });
  port.postMessage({ ready: true, ...await snapshot() });
} catch (error) { port.postMessage({ startupError: errorMessage(error), ...errorDetails(error) }); }
