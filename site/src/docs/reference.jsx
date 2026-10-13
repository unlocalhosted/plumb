/* ─────────────────────────────────────────────────────────
 * REFERENCE — the four generated pages: CLI, configuration, rules, report format (site/DOCS.md §5)
 *
 * Each page imports its own data and passes it in, so a page carries only what it shows. Every row comes from scripts/docs/gen-reference.mjs, which reads src/cli.ts, the JSON schemas and the rule sources,
 * so these pages can't drift from the code. Nothing here is typed by hand.
 *
 *  filter    a field at the top narrows the list as you type (name, path, id or text); the count says how many match;
 *            no match says so and offers to clear
 *  anchors   each command and rule has an id, so a finding's rule id links straight to it (/docs/rules#habits-hover-gate)
 *  empty     a value the source doesn't give shows as a quiet dash, never as invented prose
 * ───────────────────────────────────────────────────────── */
import { useMemo, useState } from 'react';
import { Family } from './family.jsx';

const FAMILIES = ['spacing', 'color', 'radius', 'type', 'motion', 'elevation', 'z'];
const familyId = (f) => (f === 'color' ? 'colour' : f);
const anchorOf = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
const Dash = () => <span className="text-muted-foreground">–</span>;
const Code = ({ children }) => <code className="rounded-sm bg-muted px-1 font-mono whitespace-nowrap">{children}</code>;

// A message template's placeholders are code ({sites.length}, {familyNames[family]}): show what each stands for
const NAMES = [
  [/length|count/, 'count'],
  [/famil/, 'family'],
  [/file|path/, 'file'],
  [/token|decision/, 'token'],
  [/value|amount|resolved|px/, 'value'],
  [/prop/, 'property'],
  [/class/, 'class'],
];
const nameOf = (expr) => NAMES.find(([re]) => re.test(expr))?.[1] ?? expr.split(/[^a-zA-Z]+/).filter(Boolean).pop() ?? 'value';
function Template({ text }) {
  return text
    .replace(/\b\w+\(\w*\)/g, (m) => `{${m}}`)
    .split(/(\{[^}]+\})/)
    .map((part, n) =>
      part.startsWith('{') ? (
        <span key={n} className="rounded-sm bg-tint-1 px-1 font-mono text-xs text-primary">
          {nameOf(part.slice(1, -1))}
        </span>
      ) : (
        part
      ),
    );
}

function useFilter(items, text) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? items.filter((it) => text(it).toLowerCase().includes(t)) : items;
  }, [q, items]);
  return { q, setQ, shown };
}

function Filter({ q, setQ, label, count, total, noun }) {
  return (
    <div className="my-6 flex flex-wrap items-center gap-3">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={label}
        aria-label={label}
        className="h-10 min-w-0 flex-1 rounded-md bg-card px-3 text-base shadow-plate outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
      />
      <span className="font-mono text-sm text-muted-foreground tabular-nums" aria-live="polite">
        {count === total ? `${total} ${noun}` : `${count} of ${total}`}
      </span>
    </div>
  );
}

function Nothing({ q, setQ }) {
  return (
    <p className="my-8 text-muted-foreground">
      Nothing matches <Code>{q}</Code>.{' '}
      <button type="button" onClick={() => setQ('')} className="font-semibold text-primary underline underline-offset-4">
        Clear the filter
      </button>
    </p>
  );
}

function Table({ head, rows }) {
  return (
    <div className="my-4 overflow-x-auto rounded-md shadow-plate">
      <table className="w-full border-collapse bg-card text-left text-sm">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="border-b border-border bg-muted px-4 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i}>
              {cells.map((c, j) => (
                <td key={j} className="border-b border-border px-4 py-3 align-top [tr:last-child_&]:border-0">
                  {c ?? <Dash />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── CLI ──────────────────────────────────────────────────
export function CliReference({ data: cli }) {
  const commands = cli.commands;
  const f = useFilter(commands, (c) => `${c.name} ${c.summary ?? ''} ${c.flags.map((x) => x.name).join(' ')}`);
  return (
    <>
      <Filter {...f} label="Filter commands and flags" count={f.shown.length} total={commands.length} noun="commands" />
      {f.shown.length === 0 && <Nothing {...f} />}
      {f.shown.map((c) => (
        <section key={c.name}>
          <h2 id={`plumb-${anchorOf(c.name)}`} className="mt-12 mb-3 scroll-mt-24 font-mono text-lg font-semibold">
            plumb {c.name}
          </h2>
          {c.summary && <p className="my-3 text-base">{c.summary}</p>}
          {c.usage?.length > 0 && (
            <pre className="my-3 overflow-x-auto rounded-md bg-code px-4 py-3 font-mono text-sm text-code-foreground">
              {c.usage.join('\n')}
            </pre>
          )}
          {c.flags.length > 0 && (
            <Table
              head={['Flag', 'Type', 'Default', 'Description']}
              rows={c.flags.map((x) => [<Code key="n">{x.name}</Code>, x.type, x.default != null ? <Code key="d">{String(x.default)}</Code> : null, x.description])}
            />
          )}
        </section>
      ))}
      {cli.help && (
        <section>
          <h2 id="full-help" className="mt-12 mb-3 scroll-mt-24 text-2xl font-semibold">
            The full help
          </h2>
          <p className="my-3 text-base text-muted-foreground">
            What <Code>plumb --help</Code> prints, as it prints it.
          </p>
          <pre className="my-3 overflow-x-auto rounded-md bg-code px-4 py-3 font-mono text-sm text-code-foreground">{cli.help}</pre>
        </section>
      )}
    </>
  );
}

// ── Configuration ────────────────────────────────────────
export function ConfigReference({ data: config }) {
  const options = config.options;
  const f = useFilter(options, (o) => `${o.path} ${o.type ?? ''} ${o.description ?? ''}`);
  return (
    <>
      <Filter {...f} label="Filter options" count={f.shown.length} total={options.length} noun="options" />
      {f.shown.length === 0 ? (
        <Nothing {...f} />
      ) : (
        <Table
          head={['Option', 'Type', 'Default', 'Description']}
          rows={f.shown.map((o) => [
            <span key="p" className="flex flex-col gap-1">
              <code className="font-mono font-semibold break-all" style={{ paddingInlineStart: `${(o.path.split('.').length - 1) * 0.75}rem` }}>
                {o.path}
              </code>
              {o.required && <span className="text-xs text-muted-foreground">required</span>}
            </span>,
            o.enum ? o.enum.map((e) => <Code key={e}>{String(e)}</Code>).reduce((a, b) => [a, ' ', b]) : <span className="font-mono text-xs">{o.type}</span>,
            o.default != null ? <Code key="d">{JSON.stringify(o.default)}</Code> : null,
            o.description,
          ])}
        />
      )}
    </>
  );
}

// ── Rules ────────────────────────────────────────────────
const SEVERITY = { error: 'bg-destructive text-primary-foreground', warn: 'bg-code-flag text-code', info: 'bg-muted text-foreground' };

export function RulesReference({ data: rules }) {
  const all = rules.rules;
  const f = useFilter(all, (r) => `${r.id} ${r.title ?? ''} ${r.because ?? ''} ${r.families.join(' ')}`);
  const groups = useMemo(() => {
    const m = new Map();
    for (const r of f.shown) {
      const g = r.id.split('/')[0];
      m.set(g, [...(m.get(g) ?? []), r]);
    }
    return [...m];
  }, [f.shown]);
  return (
    <>
      <Filter {...f} label="Filter rules by id, family or message" count={f.shown.length} total={all.length} noun="rules" />
      {f.shown.length === 0 && <Nothing {...f} />}
      {groups.map(([group, list]) => (
        <section key={group}>
          <h2 id={anchorOf(group)} className="mt-12 mb-2 scroll-mt-24 font-mono text-lg font-semibold">
            {group}/
          </h2>
          <div className="flex flex-col gap-3">
            {list.map((r) => (
              <article key={r.id} className="rounded-md bg-card p-4 shadow-plate">
                <h3 id={anchorOf(r.id)} className="flex scroll-mt-24 flex-wrap items-center gap-2">
                  <code className="font-mono text-base font-semibold">{r.id}</code>
                  {r.severity.map((s) => (
                    <span key={s} className={`rounded-sm px-1.5 font-mono text-xs font-semibold ${SEVERITY[s] ?? SEVERITY.info}`}>
                      {s}
                    </span>
                  ))}
                  {r.pattern && <span className="text-xs text-muted-foreground">one per {r.id.includes('habits') ? 'custom habit' : 'match'}</span>}
                </h3>
                {r.families.length > 0 && r.families.length < FAMILIES.length && (
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    {r.families.filter((x) => FAMILIES.includes(x)).map((x) => (
                      <Family key={x} id={familyId(x)}>
                        {x === 'color' ? 'Colour' : x === 'z' ? 'Z-index' : x[0].toUpperCase() + x.slice(1)}
                      </Family>
                    ))}
                  </div>
                )}
                <dl className="mt-3 grid grid-cols-[6rem_1fr] gap-x-4 gap-y-1 text-sm">
                  {[
                    ['Says', r.title],
                    ['Because', r.because],
                    ['Fix', r.fix],
                  ]
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd>
                          <Template text={v} />
                        </dd>
                      </div>
                    ))}
                  <dt className="text-muted-foreground">Accept</dt>
                  <dd>{r.accept ? <Code>{`plumb accept --rule ${r.id} --site <file:line> --why "…"`}</Code> : 'Not as an exception: fix the cause.'}</dd>
                </dl>
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

// ── Report format ────────────────────────────────────────
export function ReportReference({ data: report }) {
  const fields = report.fields;
  const f = useFilter(fields, (x) => `${x.path} ${x.type ?? ''} ${x.description ?? ''}`);
  return (
    <>
      <h2 id="an-example" className="mt-12 mb-3 scroll-mt-24 text-2xl font-semibold">
        A finding, as JSON
      </h2>
      <p className="my-3 text-base">
        One real finding from <Code>plumb check --json</Code> on the docs fixture.
      </p>
      <pre className="my-3 max-h-[28rem] overflow-auto rounded-md bg-code px-4 py-3 font-mono text-sm text-code-foreground">
        {JSON.stringify(report.example, null, 2)}
      </pre>
      <h2 id="every-field" className="mt-12 mb-3 scroll-mt-24 text-2xl font-semibold">
        Every field
      </h2>
      <Filter {...f} label="Filter fields" count={f.shown.length} total={fields.length} noun="fields" />
      {f.shown.length === 0 ? (
        <Nothing {...f} />
      ) : (
        <Table
          head={['Field', 'Type', 'Description']}
          rows={f.shown.map((x) => [
            <span key="p" className="flex flex-col gap-1">
              <code className="font-mono font-semibold break-all">{x.path}</code>
              {x.required && <span className="text-xs text-muted-foreground">required</span>}
            </span>,
            <span key="t" className="font-mono text-xs">
              {x.type}
            </span>,
            x.description,
          ])}
        />
      )}
    </>
  );
}
