import { colorDistance } from '../rules/families.js';
import type { Lab } from '../rules/families.js';
import type { Measure } from './harvest.js';

/** docs/briefs/onboarding.md section 2.3, "Cluster": single linkage within a per-measure tolerance. */
export interface Clusterable {
  key: string;
  amount: number;
  sites: number;
  /** The first example, `file:line`; the last tie-break of the representative. */
  first: string;
  lab?: Lab;
  /** Elevation: layers must match to merge. */
  layers?: number;
}
export interface Cluster<T extends Clusterable> { members: T[]; rep: T; sites: number }

/** [merge within, report as near within], in the measure's own unit. */
export const tolerances: Record<Measure, [number, number]> = {
  spacing: [1, 2], radius: [1, 2], 'type-size': [0.5, 1], 'line-height': [0.05, 0.1], 'letter-spacing': [0.01, 0.02],
  duration: [20, 50], easing: [0, 0], color: [0.02, 0.06], elevation: [2, 2], z: [0, 0],
};

/** The mode by site count; ties go to the smaller value, then the first site path. */
export function representative<T extends Clusterable>(members: T[]): T {
  return [...members].sort((a, b) => b.sites - a.sites || a.amount - b.amount || (a.first < b.first ? -1 : a.first > b.first ? 1 : 0) || (a.key < b.key ? -1 : 1))[0]!;
}
const finish = <T extends Clusterable>(members: T[]): Cluster<T> => ({ members, rep: representative(members), sites: members.reduce((sum, item) => sum + item.sites, 0) });

/** Sorted by amount; a new cluster starts when the gap to the previous value exceeds the tolerance. */
export function clusterScalar<T extends Clusterable>(items: T[], tolerance: number, same?: (a: T, b: T) => boolean): Cluster<T>[] {
  const sorted = [...items].sort((a, b) => a.amount - b.amount || (a.key < b.key ? -1 : 1));
  const groups = new Map<string, T[]>();
  // Elevation merges only inside one layer count; everything else is one group.
  for (const item of sorted) {
    const group = same ? String(item.layers ?? '') : '';
    groups.set(group, [...groups.get(group) ?? [], item]);
  }
  const clusters: Cluster<T>[] = [];
  for (const [, list] of [...groups].sort((a, b) => a[0] < b[0] ? -1 : 1)) {
    let current: T[] = [];
    for (const item of list) {
      if (current.length && item.amount - current.at(-1)!.amount > tolerance + 1e-9) { clusters.push(finish(current)); current = []; }
      current.push(item);
    }
    if (current.length) clusters.push(finish(current));
  }
  return clusters.sort((a, b) => a.rep.amount - b.rep.amount || (a.rep.key < b.rep.key ? -1 : 1));
}

/** OKLab single linkage, only between colours of one alpha. */
export function clusterColor<T extends Clusterable>(items: T[], tolerance: number): Cluster<T>[] {
  const sorted = [...items].sort((a, b) => a.amount - b.amount || (a.key < b.key ? -1 : 1));
  const parent = sorted.map((_, index) => index);
  const find = (index: number): number => parent[index] === index ? index : (parent[index] = find(parent[index]!));
  for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) {
    const a = sorted[i]!.lab, b = sorted[j]!.lab;
    if (a && b && a[3] === b[3] && colorDistance(a, b) <= tolerance + 1e-9) parent[find(j)] = find(i);
  }
  const groups = new Map<number, T[]>();
  sorted.forEach((item, index) => groups.set(find(index), [...groups.get(find(index)) ?? [], item]));
  return [...groups.values()].map(finish).sort((a, b) => a.rep.amount - b.rep.amount || (a.rep.key < b.rep.key ? -1 : 1));
}

/** Values that are exact: one cluster each. */
export function clusterExact<T extends Clusterable>(items: T[]): Cluster<T>[] {
  return [...items].sort((a, b) => a.amount - b.amount || (a.key < b.key ? -1 : 1)).map(item => finish([item]));
}

/** Adjacent clusters within the "near" tolerance that were not merged. Never merged; they become alternatives. */
export function nearPairs<T extends Clusterable>(clusters: Cluster<T>[], measure: Measure): [T, T][] {
  const [, near] = tolerances[measure];
  if (!near) return [];
  const pairs: [T, T][] = [];
  for (let i = 0; i < clusters.length; i++) for (let j = i + 1; j < clusters.length; j++) {
    const a = clusters[i]!.rep, b = clusters[j]!.rep;
    if (measure === 'color') {
      if (a.lab && b.lab && a.lab[3] === b.lab[3] && colorDistance(a.lab, b.lab) <= near + 1e-9) pairs.push([a, b]);
      continue;
    }
    if (measure === 'elevation' && a.layers !== b.layers) continue;
    if (b.amount - a.amount > near + 1e-9) break;
    pairs.push([a, b]);
  }
  return pairs;
}
