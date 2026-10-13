// Page state shared by the title strip and the sections: where the visitor is, and how the hero card is doing.
import { createContext, useContext, useState } from 'react';

// The sections after the hero, as the title strip names them.
export const SHEETS = [
  { id: 'reads', label: 'Your system' },
  { id: 'everywhere', label: 'Every site' },
  { id: 'kept-true', label: 'CI' },
  { id: 'install', label: 'Install' },
];

export const PageState = createContext(null);
export const usePage = () => useContext(PageState);

export function usePageState() {
  const [sheet, setSheet] = useState(-1); // -1: the hero, before any section
  const [fixed, setFixed] = useState(false); // the visitor finished the hero
  const [drift, setDrift] = useState(null); // drifts left on the hero card; null until it reports
  const [cheer, setCheer] = useState(0); // bumps once per fix, so the wrench turns a nut
  return { sheet, setSheet, fixed, setFixed, drift, setDrift, cheer, cheerOnce: () => setCheer((c) => c + 1) };
}
