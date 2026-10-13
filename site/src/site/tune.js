// Live tuning in development, frozen constants in production. In dev, each call adds a DialKit panel so timings,
// springs and shader values can be tuned on the page; in a production build it returns the defaults and DialKit
// never loads. Values come back in the same shape as the config.
import { useDialKit } from 'dialkit';

const plain = (config) =>
  Object.fromEntries(
    Object.entries(config).map(([k, v]) => {
      if (Array.isArray(v)) return [k, v[0]]; // [default, min, max]
      if (v && typeof v === 'object' && 'type' in v) return [k, v.type === 'spring' ? v : v.default]; // spring, select, color…
      if (v && typeof v === 'object') return [k, plain(v)]; // folder
      return [k, v];
    }),
  );

export const useTune = import.meta.env.DEV ? (name, config) => useDialKit(name, config) : (_name, config) => plain(config);
