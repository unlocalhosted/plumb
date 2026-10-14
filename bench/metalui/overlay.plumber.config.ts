// The benchmark's MetalUI configuration, plus the library source the docs site imports through its aliases:
// the overlay must place elements that MetalUI's own components render.
import base from './plumber.config.ts';

export default { ...base, source: [...base.source, 'packages/metalui/src/**/*.{tsx,ts,css}'] };
