// The tuned constants: each call returns the config's defaults, in the same shape as the config ([default, min, max]
// becomes the default, a spring stays a spring, a folder stays a folder).

const plain = (config) =>
  Object.fromEntries(
    Object.entries(config).map(([k, v]) => {
      if (Array.isArray(v)) return [k, v[0]]; // [default, min, max]
      if (v && typeof v === 'object' && 'type' in v) return [k, v.type === 'spring' ? v : v.default]; // spring, select, color…
      if (v && typeof v === 'object') return [k, plain(v)]; // folder
      return [k, v];
    }),
  );

export const useTune = (_name, config) => plain(config);
