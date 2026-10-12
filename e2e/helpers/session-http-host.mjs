// Separate host process keeps client body handling out of health measurements.
import { createServer } from 'node:http';
import { Session } from '../../dist/session/index.js';
import { createHandler, createWebHandler } from '../../dist/session/server.js';
import { Session as Inspector } from 'node:inspector/promises';
import { writeFile } from 'node:fs/promises';

const session = await Session.create({ root: process.argv[2], watch: false, readQueueMs: 15000 });
const server = createServer(createHandler(session));
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const web = createWebHandler(session, { peerAddress: '127.0.0.1' });
let inspector;
process.on('message', async ({ id, type, queries, path }) => {
  try {
    let result;
    if (type === 'baseline') {
      result = [];
      for (const { method, args, route } of queries) {
        const value = await session[method](...args);
        // Also exercise the shared Web transport and preserve exact JSON bytes.
        result.push({ object: typeof value === 'object', body: JSON.stringify(value),
          web: await (await web(new Request(origin + route))).text() });
      }
    } else if (type === 'profile-start') {
      inspector = new Inspector(); inspector.connect();
      await inspector.post('Profiler.enable');
      await inspector.post('Profiler.setSamplingInterval', { interval: 100 });
      await inspector.post('Profiler.start');
    } else if (type === 'profile-stop') {
      const { profile } = await inspector.post('Profiler.stop');
      await writeFile(path, JSON.stringify(profile));
      inspector.disconnect();
    } else if (type === 'close') {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
      await session.close();
      process.disconnect();
      return;
    }
    process.send({ id, result });
  } catch (error) { process.send({ id, error: error.stack }); }
});
process.send({ ready: true, origin });
