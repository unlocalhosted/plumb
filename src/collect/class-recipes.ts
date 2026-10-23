import type { Node } from 'oxc-parser';
import { nodeName, unwrap } from './source.js';
import { argumentMode, configKeyMode } from './class-helpers.js';
import type { ClassHelper } from './class-helpers.js';

/** A bounded, static class recipe. Variant selectors are metadata, never classes. */
export interface ClassRecipe {
  classes: string[];
  variants: Record<string, string>;
  signature: Record<string, string[]>;
  default: boolean;
}
const empty = (): ClassRecipe => ({ classes: [], variants: {}, signature: {}, default: true });
const limit = 64;
type ObjectNode = Extract<Node, { type: 'ObjectExpression' }>;
type PropertyNode = Extract<ObjectNode['properties'][number], { type: 'Property' }>;
function properties(input: Node | undefined): PropertyNode[] {
  const node = input && unwrap(input);
  return node?.type === 'ObjectExpression' ? node.properties.filter((p): p is PropertyNode => p.type === 'Property' && !p.computed) : [];
}
const property = (node: Node | undefined, name: string) => properties(node).findLast(p => nodeName(p.key) === name)?.value;
const scalar = (node: Node | undefined): string | undefined => node?.type === 'Literal' && ['string', 'number', 'boolean'].includes(typeof node.value) ? String(node.value) : undefined;
function combine(left: ClassRecipe[], right: ClassRecipe[]): ClassRecipe[] {
  if (left.length * right.length > limit) return [];
  return left.flatMap(a => right.map(b => ({ classes: [...new Set([...a.classes, ...b.classes])], variants: { ...a.variants, ...b.variants }, signature: { ...a.signature, ...b.signature }, default: a.default && b.default })));
}

/** Reuses classHelpers' argument/key contracts; never calls project code. */
export function readClassRecipes(input: Node, helpers: ReadonlyMap<string, ClassHelper>, binding: (name: string) => Node | undefined, importedName: (name: string) => string): ClassRecipe[] {
  function read(input: Node, seen = new Set<string>(), depth = 0): ClassRecipe[] {
    if (depth > 16) return [];
    const node = unwrap(input);
    const recur = (child: Node) => read(child, seen, depth + 1);
    if (node.type === 'JSXExpressionContainer') return recur(node.expression);
    if (node.type === 'Literal' && typeof node.value === 'string') return [{ ...empty(), classes: node.value.split(/\s+/).filter(Boolean) }];
    if (node.type === 'TemplateLiteral') {
      let recipes = [empty()];
      node.quasis.forEach((quasi, index) => {
        const text = quasi.value.cooked ?? '';
        for (const match of text.matchAll(/\S+/g)) if ((index === 0 || match.index > 0) && (index === node.quasis.length - 1 || match.index + match[0].length < text.length)) {
          for (const recipe of recipes) recipe.classes.push(match[0]);
        }
        const expression = node.expressions[index];
        if (expression && (text === '' && index === 0 || /\s$/.test(text)) && (index + 1 === node.quasis.length - 1 && node.quasis[index + 1]?.value.cooked === '' || /^\s/.test(node.quasis[index + 1]?.value.cooked ?? ''))) recipes = combine(recipes, recur(expression));
      });
      return recipes;
    }
    if (node.type === 'Identifier') {
      if (seen.has(node.name)) return [];
      const value = binding(node.name);
      return value ? read(value, new Set([...seen, node.name]), depth + 1) : [empty()];
    }
    if (node.type === 'ConditionalExpression') return [...recur(node.consequent), ...recur(node.alternate)].slice(0, limit);
    if (node.type === 'LogicalExpression') return node.operator === '&&' ? [empty(), ...recur(node.right)] : [...recur(node.left), ...recur(node.right)].slice(0, limit);
    if (node.type === 'ArrayExpression') return node.elements.reduce<ClassRecipe[]>((recipes, child) => child ? combine(recipes, recur(child)) : recipes, [empty()]);
    if (node.type === 'ObjectExpression') return [{ ...empty(), classes: properties(node).filter(p => !(p.value.type === 'Literal' && !p.value.value)).flatMap(p => nodeName(p.key).split(/\s+/)) }];
    if (node.type !== 'CallExpression') return [empty()];
    const name = node.callee.type === 'MemberExpression' && !node.callee.computed ? nodeName(node.callee.property) : nodeName(node.callee);
    const helper = helpers.get(importedName(name));
    if (!helper) {
      const target = binding(name);
      // A call to the cva result reads its definition, not selector strings.
      if (seen.has(name) || target?.type !== 'CallExpression') return [empty()];
      const selections = properties(node.arguments[0]).flatMap(p => {
        const value = scalar(p.value); return value === undefined ? [] : [[nodeName(p.key), value] as const];
      });
      return read(target, new Set([...seen, name]), depth + 1).filter(recipe => selections.every(([axis, choice]) => !(axis in recipe.variants) || recipe.variants[axis] === choice));
    }
    const objectSignature = importedName(name) === 'cva' && node.arguments[0]?.type === 'ObjectExpression';
    const config = objectSignature || helper.args === 'config' ? node.arguments[0] : helper.configFrom === undefined ? undefined : node.arguments[helper.configFrom];
    let recipes = [empty()];
    for (const [index, argument] of node.arguments.entries()) {
      if (argument === config || argumentMode(helper, index) === 'config') continue;
      recipes = combine(recipes, recur(argument));
    }
    if (!config) return recipes;
    for (const key of ['base', 'class', 'className']) {
      const value = property(config, key);
      if (value && configKeyMode(helper, key)) recipes = combine(recipes, recur(value));
    }
    const defaults = property(config, 'defaultVariants');
    for (const axis of properties(configKeyMode(helper, 'variants') ? property(config, 'variants') : undefined)) {
      const axisName = nodeName(axis.key), choices = properties(axis.value);
      const selected = scalar(property(defaults, axisName));
      const options = choices.flatMap(choice => recur(choice.value).map(recipe => ({
        ...recipe, signature: { [axisName]: recipe.classes }, variants: { [axisName]: nodeName(choice.key) }, default: selected === nodeName(choice.key),
      })));
      if (selected === undefined) options.unshift({ ...empty(), default: true });
      recipes = combine(recipes, options);
    }
    const compounds = configKeyMode(helper, 'compoundVariants') ? property(config, 'compoundVariants') : undefined;
    if (compounds?.type === 'ArrayExpression') for (const entry of compounds.elements) if (entry) {
      for (const recipe of recipes) {
        const predicates = properties(entry).filter(p => !['class', 'className'].includes(nodeName(p.key)));
        if (!predicates.length || !predicates.every(p => {
          const choices = p.value.type === 'ArrayExpression' ? p.value.elements.map(v => v ? scalar(v) : undefined) : [scalar(p.value)];
          return choices.includes(recipe.variants[nodeName(p.key)]);
        })) continue;
        for (const key of ['class', 'className']) {
          const payload = property(entry, key);
          const classes = payload && recur(payload);
          if (classes?.length === 1) recipe.classes = [...new Set([...recipe.classes, ...classes[0]!.classes])];
        }
      }
    }
    return recipes;
  }
  return read(input);
}
