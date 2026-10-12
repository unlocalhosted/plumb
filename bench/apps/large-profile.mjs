// Loaded in both Session workers by --import; inspector profiles stop before
// termination, which otherwise discards an active inspector recording.
import { Session } from 'node:inspector';
import { BroadcastChannel, isMainThread, threadId } from 'node:worker_threads';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

if (!isMainThread && process.env.PLUMB_LARGE_PROFILE) {
  const inspector = new Session(); inspector.connect();
  const post = method => new Promise((resolve, reject) => inspector.post(method, (error, result) => error ? reject(error) : resolve(result)));
  await post('Profiler.enable'); await post('Profiler.start');
  const channel = new BroadcastChannel('plumb-large-profile'); channel.unref();
  channel.onmessage = async ({ data }) => {
    if (data !== 'stop') return;
    const { profile } = await post('Profiler.stop');
    writeFileSync(join(process.env.PLUMB_LARGE_PROFILE, `session-${threadId}.cpuprofile`), JSON.stringify(profile));
    channel.postMessage({ saved: threadId }); channel.close(); inspector.disconnect();
  };
}
