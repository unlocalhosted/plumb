import { colorDistance } from '../rules/families.js';
import { pixels } from '../decisions/resolve.js';
import { clusterColor, clusterExact, clusterScalar, nearPairs, tolerances } from './cluster.js';
import type { Cluster } from './cluster.js';
import { compact, draftedWhy, durationNames, hueName, ladderNames, shadowNames } from './names.js';
import type { Measure, Value } from './harvest.js';

/** docs/briefs/onboarding.md section 2.3, "Snap to a ladder" and "Name". */
export type LadderName = 'tailwind-numeric' | 'tailwind-type' | 'grid-4' | 'grid-8' | 'framework' | 'as-found';

export interface Absorb { value: string; sites: number; via: 'merge' | 'snap' }
export interface Step {
  name: string;
  value: string;
  sites: number;
  files: number;
  examples: string[];
  /** Values that move to this step: merged spellings and values that snap to it. */
  absorbs: Absorb[];
  why: string;
  /** False for the steps of Tailwind's numeric scale: the base is the token, the steps are its multiples. */
  written: boolean;
}
export interface OffLadder { value: string; sites: number; examples: string[]; nearest: string }
export interface Token { name: string; value: string; why: string }
export interface Scale {
  measure: Measure;
  ladder: LadderName;
  /** Distinct values in use, and the places they are used. */
  values: number;
  sites: number;
  files: number;
  considered: { ladder: LadderName; distance: number }[];
  steps: Step[];
  offLadder: OffLadder[];
  merged: { value: string; into: string; sites: number }[];
  near: [string, string][];
  nearMore: number;
  /** What `--write` puts in the theme. */
  tokens: Token[];
}

export interface FitContext {
  /** Tailwind's numeric spacing base, when it is in force: its pixels and its spelling. */
  numeric?: { unit: number; text: string };
}

const multiples = (step: number, from: number, to: number) => { const list: number[] = []; for (let n = from; n <= to + 1e-9; n += step) list.push(n); return list; };
const numericSteps = (unit: number) => [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96].map(n => n * unit);
const gridSteps = { 'grid-4': multiples(4, 4, 128), 'grid-8': [4, ...multiples(8, 8, 128)] } as const;
const tailwindType: [string, number][] = [['xs', 12], ['sm', 14], ['base', 16], ['lg', 18], ['xl', 20], ['2xl', 24], ['3xl', 30], ['4xl', 36], ['5xl', 48], ['6xl', 60], ['7xl', 72], ['8xl', 96], ['9xl', 128]];
const limit: Partial<Record<Measure, number>> = { spacing: 1, radius: 1, 'type-size': 0.5 };
const nearest = (amount: number, steps: number[]) => steps.reduce((best, step) => Math.abs(step - amount) < Math.abs(best - amount) - 1e-9 ? step : best, steps[0]!);

interface Cell { amount: number; value: string; frameworkKey?: string; name?: string; rep?: Value }
interface Assigned { cell: Cell; members: Value[]; via: Map<Value, 'merge' | 'snap'> }

/** Which cell each cluster belongs to, nearest first; ties to the smaller. */
function assign(clusters: Cluster<Value>[], cells: Cell[]): { assigned: Map<Cell, Assigned>; cost: number; sites: number } {
  const assigned = new Map<Cell, Assigned>();
  let cost = 0, sites = 0;
  for (const cluster of clusters) {
    const cell = cells.reduce((best, item) => Math.abs(item.amount - cluster.rep.amount) < Math.abs(best.amount - cluster.rep.amount) - 1e-9 ? item : best, cells[0]!);
    const entry: Assigned = assigned.get(cell) ?? { cell, members: [], via: new Map() };
    for (const member of cluster.members) {
      entry.members.push(member);
      entry.via.set(member, member === cluster.rep ? 'snap' : 'merge');
      cost += member.sites * Math.abs(member.amount - cell.amount); sites += member.sites;
    }
    assigned.set(cell, entry);
  }
  return { assigned, cost, sites };
}

const text = (value: Value, measure: Measure) => value.text;
function asFoundCells(clusters: Cluster<Value>[]): Cell[] {
  return clusters.map(cluster => ({ amount: cluster.rep.amount, value: cluster.rep.text, rep: cluster.rep }));
}

export function fit(measure: Measure, values: Value[], context: FitContext = {}): Scale {
  const total = values.reduce((sum, item) => sum + item.sites, 0);
  const files = new Set<string>();
  for (const item of values) item.fileList.forEach(file => files.add(file));
  const [merge] = tolerances[measure];
  const clusters: Cluster<Value>[] = measure === 'color' ? clusterColor(values, merge) : measure === 'easing' || measure === 'z' ? clusterExact(values)
    : measure === 'elevation' ? clusterScalar(values, merge, () => true) : clusterScalar(values, merge);

  const considered: Scale['considered'] = [];
  let ladder: LadderName = 'as-found';
  let cells: Cell[] = asFoundCells(clusters);
  let assigned: Map<Cell, Assigned>;

  const keyed = values.filter(item => item.frameworkKey);
  const keyedSites = keyed.reduce((sum, item) => sum + item.sites, 0);
  if (measure === 'spacing' && context.numeric) {
    ladder = 'tailwind-numeric';
    cells = numericSteps(context.numeric.unit).map(amount => ({ amount, value: `${compact(amount)}px` }));
    const result = assign(clusters, cells);
    considered.push({ ladder, distance: total ? Number((result.cost / total).toFixed(2)) : 0 });
    assigned = result.assigned;
  } else if (keyed.length && keyedSites * 2 >= total && (measure === 'radius' || measure === 'type-size' || measure === 'color' || measure === 'elevation')) {
    ladder = 'framework';
    // Steps are the keys in use. Everything else moves to the nearest key if it is within reach.
    const byKey = new Map<string, Value[]>();
    for (const item of keyed) byKey.set(item.frameworkKey!, [...byKey.get(item.frameworkKey!) ?? [], item]);
    const keyCells: Cell[] = [...byKey].map(([name, list]) => {
      const first = list[0]!;
      return { amount: measure === 'color' || measure === 'elevation' ? first.amount : pixels(first.frameworkValue ?? first.text) ?? first.amount, value: first.frameworkValue ?? first.text, frameworkKey: name, name };
    }).sort((a, b) => a.amount - b.amount || (a.name! < b.name! ? -1 : 1));
    cells = [...keyCells];
    assigned = new Map(keyCells.map(cell => [cell, { cell, members: [...byKey.get(cell.frameworkKey!)!], via: new Map() }]));
    const [, near] = tolerances[measure];
    const literal = clusters.map(cluster => ({ ...cluster, members: cluster.members.filter(member => !member.frameworkKey) })).filter(cluster => cluster.members.length);
    for (const cluster of literal) {
      const rep = cluster.members.includes(cluster.rep) ? cluster.rep : cluster.members[0]!;
      const distance = (cell: Cell, other: Value) => measure === 'color' ? (rep.lab && other.lab ? colorDistance(rep.lab, other.lab) : Infinity) : Math.abs(cell.amount - rep.amount);
      let best: Cell | undefined, bestDistance = Infinity;
      for (const cell of keyCells) {
        const reference = byKey.get(cell.frameworkKey!)![0]!;
        const gap = distance(cell, reference);
        if (gap < bestDistance - 1e-9) { best = cell; bestDistance = gap; }
      }
      // Elevation has no distance to measure: a shadow that is not a key stays off the ladder.
      if (best && measure !== 'elevation' && bestDistance <= Math.max(near, merge) + 1e-9) {
        const entry = assigned.get(best)!;
        for (const member of cluster.members) { entry.members.push(member); entry.via.set(member, bestDistance <= merge + 1e-9 ? 'merge' : 'snap'); }
      } else {
        const own: Cell = { amount: rep.amount, value: rep.text, rep };
        cells.push(own);
        assigned.set(own, { cell: own, members: cluster.members, via: new Map(cluster.members.map(member => [member, 'merge' as const])) });
      }
    }
    considered.push({ ladder, distance: 0 });
  } else if (measure === 'spacing' || measure === 'radius' || measure === 'type-size') {
    const candidates: { ladder: LadderName; cells: Cell[] }[] = measure === 'type-size'
      ? [{ ladder: 'tailwind-type', cells: tailwindType.map(([name, size]) => ({ amount: size, value: `${size / 16}rem`, name: `--text-${name}` })) }]
      : (['grid-4', 'grid-8'] as const).map(name => ({ ladder: name, cells: gridSteps[name].map(amount => ({ amount, value: `${compact(amount)}px` })) }));
    let best: { ladder: LadderName; cells: Cell[]; result: ReturnType<typeof assign>; kept: number } | undefined;
    for (const candidate of candidates) {
      const result = assign(clusters, candidate.cells);
      const kept = [...result.assigned.values()].filter(entry => entry.members.reduce((sum, member) => sum + member.sites, 0) >= Math.min(0.02 * total, 3)).length;
      considered.push({ ladder: candidate.ladder, distance: total ? Number((result.cost / total).toFixed(2)) : 0 });
      const better = !best || result.cost < best.result.cost - 1e-9 || Math.abs(result.cost - best.result.cost) <= 1e-9 && (kept < best.kept || kept === best.kept && candidate.ladder < best.ladder);
      if (better) best = { ...candidate, result, kept };
    }
    if (best && total && best.result.cost / total <= limit[measure]! + 1e-9) { ladder = best.ladder; cells = best.cells; assigned = best.result.assigned; }
    else {
      assigned = new Map(clusters.map(cluster => {
        const cell: Cell = { amount: cluster.rep.amount, value: cluster.rep.text, rep: cluster.rep };
        return [cell, { cell, members: cluster.members, via: new Map(cluster.members.map(member => [member, member === cluster.rep ? 'snap' as const : 'merge' as const])) }];
      }));
      considered.push({ ladder: 'as-found', distance: 0 });
    }
  } else {
    assigned = new Map(clusters.map(cluster => {
      const cell: Cell = { amount: cluster.rep.amount, value: cluster.rep.text, rep: cluster.rep };
      return [cell, { cell, members: cluster.members, via: new Map(cluster.members.map(member => [member, member === cluster.rep ? 'snap' as const : 'merge' as const])) }];
    }));
  }

  // Keep a step that absorbs 2% of the family's places or 3, whichever is fewer.
  const threshold = Math.min(0.02 * total, 3);
  const entries = [...assigned.values()].filter(entry => entry.members.length).sort((a, b) => a.cell.amount - b.cell.amount || (a.cell.value < b.cell.value ? -1 : 1));
  const sitesOf = (entry: Assigned) => entry.members.reduce((sum, member) => sum + member.sites, 0);
  const kept = entries.filter(entry => sitesOf(entry) >= threshold - 1e-9);
  const dropped = entries.filter(entry => !kept.includes(entry));

  // Names.
  const names = new Map<Assigned, string>();
  const centre = (list: Assigned[], score: (entry: Assigned) => number) => {
    let index = 0;
    list.forEach((entry, at) => { if (score(entry) > score(list[index]!)) index = at; });
    return index;
  };
  if (ladder === 'framework') kept.forEach(entry => { const name = entry.cell.name ?? entry.cell.frameworkKey; if (name) names.set(entry, name); });
  if (ladder === 'tailwind-numeric') kept.forEach(entry => names.set(entry, `--spacing-${compact(entry.cell.amount / context.numeric!.unit)}`));
  if (ladder === 'tailwind-type') kept.forEach(entry => names.set(entry, entry.cell.name!));
  const rest = kept.filter(entry => !names.has(entry));
  const amounts = rest.map(entry => entry.cell.amount);
  const byValue = ladder === 'framework';
  if (rest.length) {
    if (byValue && (measure === 'radius' || measure === 'type-size')) {
      // Next to Tailwind's own names, an odd value is named by what it is.
      rest.forEach(entry => names.set(entry, `${measure === 'radius' ? '--radius' : '--text'}-${compact(entry.cell.amount)}`));
    } else if (measure === 'spacing' || measure === 'radius') {
      const prefix = measure === 'spacing' ? '--spacing' : '--radius';
      ladderNames(prefix, amounts, centre(rest, sitesOf)).forEach((name, index) => names.set(rest[index]!, name));
    } else if (measure === 'type-size') {
      ladderNames('--text', amounts, centre(rest, entry => entry.members.reduce((sum, member) => sum + member.body, 0) * 1e6 + sitesOf(entry)), 'type').forEach((name, index) => names.set(rest[index]!, name));
    } else if (measure === 'line-height') rest.forEach(entry => names.set(entry, `--leading-${Math.round(entry.cell.amount * 100)}`));
    else if (measure === 'letter-spacing') rest.forEach(entry => names.set(entry, `--tracking-${entry.cell.amount < 0 ? 'n' : ''}${Math.round(Math.abs(entry.cell.amount) * 1000)}`));
    else if (measure === 'duration') durationNames(amounts, centre(rest, sitesOf)).forEach((name, index) => names.set(rest[index]!, name));
    else if (measure === 'easing') {
      const curves = rest.filter(entry => entry.cell.value.startsWith('cubic-bezier') || entry.cell.value.startsWith('steps')).sort((a, b) => sitesOf(b) - sitesOf(a) || (a.cell.value < b.cell.value ? -1 : 1));
      rest.forEach(entry => { if (!curves.includes(entry)) names.set(entry, `--ease-${entry.cell.value}`); });
      curves.forEach((entry, index) => names.set(entry, `--ease-curve-${index + 1}`));
    } else if (measure === 'color') {
      const byHue = new Map<string, Assigned[]>();
      for (const entry of rest) {
        const rep = entry.members[0]!;
        const hue = rep.lab ? hueName(rep.lab) : 'gray';
        byHue.set(hue, [...byHue.get(hue) ?? [], entry]);
      }
      for (const [hue, list] of byHue) {
        // Lightest first: rank 1 is the lightest of its hue.
        list.sort((a, b) => (b.members[0]!.lab?.[0] ?? 0) - (a.members[0]!.lab?.[0] ?? 0) || (a.cell.value < b.cell.value ? -1 : 1))
          .forEach((entry, index) => names.set(entry, `--color-${hue}-${index + 1}`));
      }
    } else if (measure === 'elevation') {
      const ordered = [...rest].sort((a, b) => a.cell.amount - b.cell.amount || (a.cell.value < b.cell.value ? -1 : 1));
      (byValue ? ordered.map((_, index) => `--shadow-${index + 1}`) : shadowNames(ordered.length)).forEach((name, index) => names.set(ordered[index]!, name));
    } else if (measure === 'z') rest.forEach(entry => names.set(entry, `--z-${entry.cell.value}`));
  }
  // Names stay unique inside a scale.
  const used = new Set<string>();
  for (const entry of kept) {
    let name = names.get(entry)!, suffix = 2;
    while (used.has(name)) name = `${names.get(entry)}-${suffix++}`;
    used.add(name); names.set(entry, name);
  }

  const stepOf = (entry: Assigned): Step => {
    const members = [...entry.members].sort((a, b) => b.sites - a.sites || (a.key < b.key ? -1 : 1));
    const exact = entry.cell.frameworkKey ? members.filter(member => member.frameworkKey === entry.cell.frameworkKey)
      : entry.cell.rep ? [entry.cell.rep] : members.filter(member => Math.abs(member.amount - entry.cell.amount) < 1e-9);
    const props = new Map<string, number>();
    for (const member of members) for (const prop of member.props) props.set(prop, (props.get(prop) ?? 0) + member.sites);
    const siteCount = sitesOf(entry), fileSet = new Set<string>();
    for (const member of members) member.fileList.forEach(file => fileSet.add(file));
    const fileCount = fileSet.size;
    const examples = [...new Set(members.flatMap(member => member.examples))].sort().slice(0, 3);
    const value = ladder === 'tailwind-numeric' || ladder === 'grid-4' || ladder === 'grid-8' ? `${compact(entry.cell.amount)}px` : entry.cell.value;
    return {
      name: names.get(entry)!, value, sites: siteCount, files: fileCount, examples,
      absorbs: members.filter(member => !exact.includes(member)).map(member => ({ value: member.text, sites: member.sites, via: entry.via.get(member) ?? 'snap' }))
        .sort((a, b) => b.sites - a.sites || (a.value < b.value ? -1 : 1)),
      why: draftedWhy([...props].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([prop]) => prop), siteCount, fileCount, [...new Set(members.flatMap(member => member.examples))].sort()),
      written: ladder !== 'tailwind-numeric',
    };
  };
  const steps = kept.map(stepOf);
  const offLadder: OffLadder[] = dropped.flatMap(entry => {
    const target = kept.length ? kept.reduce((best, item) => Math.abs(item.cell.amount - entry.cell.amount) < Math.abs(best.cell.amount - entry.cell.amount) - 1e-9 ? item : best, kept[0]!) : undefined;
    return entry.members.map(member => ({ value: member.text, sites: member.sites, examples: member.examples, nearest: target ? names.get(target)! : '' }));
  }).sort((a, b) => b.sites - a.sites || (a.value < b.value ? -1 : 1));

  const merged = clusters.flatMap(cluster => cluster.members.filter(member => member !== cluster.rep).map(member => ({ value: member.text, into: cluster.rep.text, sites: member.sites })))
    .sort((a, b) => b.sites - a.sites || (a.value < b.value ? -1 : 1));
  const pairs = nearPairs(clusters, measure).map(([a, b]) => [text(a, measure), text(b, measure)] as [string, string]);

  const tokens: Token[] = ladder === 'tailwind-numeric'
    ? [{ name: '--spacing', value: context.numeric!.text, why: "Tailwind's numeric scale, kept as yours (drafted)" }]
    : steps.map(step => ({ name: step.name, value: step.value, why: step.why }));
  return { measure, ladder, values: values.length, sites: total, files: files.size, considered, steps, offLadder, merged, near: pairs.slice(0, 20), nearMore: Math.max(0, pairs.length - 20), tokens };
}
