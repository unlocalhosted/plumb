// The homepage: the visitor fixes a drifted card with Plumb's real overlay, then scrolls through what Plumb
// reads, how it measures, and how it keeps a whole codebase true. Plumb's overlay is running on the page, so every part of it can be pointed at.
import { PageState, Sheet, usePageState } from './site/Sheet.jsx';
import { TitleStrip } from './site/TitleStrip.jsx';
import { SHEET_VH } from './site/motion.js';
import { CoverFigure, coverBeats } from './sheets/Cover.jsx';
import { Hero } from './hero/Hero.jsx';
import { DriftFigure, driftBeats } from './sheets/Drift.jsx';
import { ScalesFigure, scalesBeats } from './sheets/Scales.jsx';
import { EverywhereFigure, everywhereBeats } from './sheets/Everywhere.jsx';
import { KeptFigure, keptBeats } from './sheets/KeptTrue.jsx';
import { Close } from './sheets/Close.jsx';

export function Home() {
  const page = usePageState();
  return (
    <PageState.Provider value={page}>
      <TitleStrip />
      <main>
        <Hero />
        <Sheet n={0} vh={SHEET_VH.cover} title="What a component is made of." beats={coverBeats} figure={(p) => <CoverFigure progress={p} />} />
        <Sheet n={1} vh={SHEET_VH.drift} title="A component drifts, and nobody sees it." beats={driftBeats} figure={(p) => <DriftFigure progress={p} />} />
        <Sheet n={2} vh={SHEET_VH.reading} title="It measures against your own scales." beats={scalesBeats} figure={(p) => <ScalesFigure progress={p} />} />
        <Sheet n={3} vh={SHEET_VH.everywhere} title="One decision, every site." beats={everywhereBeats} figure={(p) => <EverywhereFigure progress={p} />} />
        <Sheet n={4} vh={SHEET_VH.kept} title="Only new drift fails." beats={keptBeats} figure={(p) => <KeptFigure progress={p} />} />
        <Close />
      </main>
    </PageState.Provider>
  );
}
