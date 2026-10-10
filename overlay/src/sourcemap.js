// Source maps are read by bippy (react-grab's source layer). This module only records when the dev server has replaced
// modules, so the next locate reads fresh maps instead of bippy's cached ones. Vite calls it on vite:afterUpdate.
let version = 0;

export const sourceMapVersion = () => version;
export function invalidateSourceMaps() { version++; }
