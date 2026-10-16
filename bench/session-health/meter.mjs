// Loaded only by the scratch profiling test and its separate HTTP host.
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
let histogram, cpu, utilization, start, timer, previous, gaps;

globalThis.ciHealthStart = async () => {
  histogram = monitorEventLoopDelay({ resolution: 1 }); histogram.enable();
  await new Promise(resolve => setTimeout(resolve, 20)); histogram.reset();
  cpu = process.threadCpuUsage(); utilization = performance.eventLoopUtilization();
  start = performance.now(); previous = { wall: start, cpu }; gaps = [];
  timer = setInterval(() => {
    const wall = performance.now(), usage = process.threadCpuUsage(previous.cpu);
    gaps.push({ wallMs: wall - previous.wall, cpuMs: (usage.user + usage.system) / 1000 });
    previous = { wall, cpu: process.threadCpuUsage() };
  }, 1);
  // Named markers help locate the measured window in the CPU profile.
  function CI_HEALTH_START_MARKER() { const at = performance.now(); while (performance.now() - at < 3) {} }
  CI_HEALTH_START_MARKER();
};

globalThis.ciHealthStop = (label, probes = []) => {
  function CI_HEALTH_STOP_MARKER() { const at = performance.now(); while (performance.now() - at < 3) {} }
  CI_HEALTH_STOP_MARKER();
  const usage = process.threadCpuUsage(cpu), loop = performance.eventLoopUtilization(utilization);
  histogram.disable(); clearInterval(timer);
  console.log('CI_HEALTH ' + JSON.stringify({ label, pid: process.pid, wallMs: performance.now() - start,
    cpuMs: (usage.user + usage.system) / 1000, loop,
    probes: probes.length, healthMaxMs: probes.length ? Math.max(...probes) : undefined,
    gaps: gaps.sort((a, b) => b.wallMs - a.wallMs).slice(0, 5),
    delay: { maxMs: histogram.max / 1e6, p99Ms: histogram.percentile(99) / 1e6, samples: histogram.count } }));
};
