import { monitorEventLoopDelay } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';

export async function startEventLoopMeasurement() {
  const histogram = monitorEventLoopDelay({ resolution: 1 });
  histogram.enable();
  // Arm the sampler before the workload; exclude setup and baseline reads.
  await delay(10);
  histogram.reset();
  return histogram;
}

export async function finishEventLoopMeasurement(histogram) {
  // Sample the final response turn before disabling the monitor.
  await delay(2);
  histogram.disable();
  return { maxMs: histogram.max / 1e6, p99Ms: histogram.percentile(99) / 1e6, samples: histogram.count };
}
