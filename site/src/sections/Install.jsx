/* ─────────────────────────────────────────────────────────
 * PROOF, THEN INSTALL (site/HOMEPAGE.md §4.5) — paper section
 *
 *  proof     four facts, each one checkable: no logos, no star counts, no testimonials
 *  install   four step cards. Copy flips a card over (rotateY 180°, 320ms, perspective 900px); its back shows ✓ and
 *            points at the next step. The overlay step carries the "Ships 0 bytes to prod" sticker.
 *  all four  copied: the wrench in the title strip seats one last nut
 * ───────────────────────────────────────────────────────── */
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Section } from './Section.jsx';
import { Shipping } from '../system/Sticker.jsx';
import { usePage } from '../site/Sheet.jsx';
import { Button } from '@/components/ui/button';

const TIMING = { flip: 0.32 }; // s

const PROOF = [
  { title: 'Judges compiled CSS, not class names', body: '@apply, inline styles and plain CSS all compile to the same declarations, so they get the same answer.' },
  { title: 'Only new drift fails', body: 'A baseline records the drift you already have. Turn it on today on a messy repo; pull requests are judged on what they add.' },
  { title: 'Dev only', body: 'The overlay is wired into your dev server. Production builds carry none of it.' },
  { title: 'Fast enough to run on save', body: 'A warm check of a 341-file React app (MetalUI docs) measured 997 ms.' },
];

const STEPS = [
  { cmd: 'npx @unlocalhosted/plumb', say: 'Report the drift. No config, nothing written.' },
  { cmd: 'npm i -D @unlocalhosted/plumb && npx plumb init', say: 'Add a config and a baseline of the drift you have today.' },
  { cmd: 'npx plumb install --overlay --write', say: 'Wire the overlay into your dev server.', sticker: true },
  { cmd: 'npx plumb install', say: 'Set up your coding agent: for Claude Code it writes .claude/skills/plumb/SKILL.md, so the agent fixes drift the way Plumb says.' },
];

export function Install() {
  const page = usePage();
  const [copied, setCopied] = useState(() => new Set());
  const all = copied.size === STEPS.length;
  useEffect(() => {
    if (all) page.cheerOnce();
  }, [all]);
  return (
    <Section id="install" n={3} cta={null} title="Proof, then install." lead="Four facts you can check, then four commands. The first changes nothing in your repo.">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROOF.map((p) => (
          <li key={p.title} className="plate flex flex-col gap-2 p-5">
            <span className="text-base font-semibold">{p.title}</span>
            <span className="text-sm text-muted-foreground">{p.body}</span>
          </li>
        ))}
      </ul>
      <ol className="grid gap-4 md:grid-cols-2">
        {STEPS.map((s, i) => (
          <StepCard key={s.cmd} n={i + 1} step={s} next={STEPS[i + 1]} done={copied.has(i)} onCopy={() => setCopied((c) => new Set(c).add(i))} />
        ))}
      </ol>
    </Section>
  );
}

function StepCard({ n, step, next, done, onCopy }) {
  const reduce = useReducedMotion();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(step.cmd);
    } catch {}
    onCopy();
  };
  const face = 'absolute inset-0 flex flex-col gap-3 rounded-lg bg-card p-5 shadow-plate [backface-visibility:hidden]';
  return (
    <li className="relative h-48 [perspective:900px]">
      <motion.div className="relative size-full [transform-style:preserve-3d]" animate={{ rotateY: done ? 180 : 0 }} transition={{ duration: reduce ? 0 : TIMING.flip, ease: [0.4, 0, 0.2, 1] }}>
        {/* front: the command */}
        <div className={face} aria-hidden={done}>
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid size-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground">{n}</span>
            {step.say}
          </span>
          <div className="mt-auto flex min-w-0 items-center justify-between gap-3 rounded-md bg-code py-1.5 pr-1.5 pl-4 text-code-foreground">
            <code className="truncate font-mono text-sm">
              <span className="select-none opacity-50">$ </span>
              {step.cmd}
            </code>
            <Button size="sm" onClick={copy} aria-label={`Copy ${step.cmd}`} className="rounded-sm">
              Copy
            </Button>
          </div>
        </div>
        {/* back: done, and what's next */}
        <div className={`${face} items-center justify-center text-center [transform:rotateY(180deg)]`} aria-hidden={!done}>
          <span className="grid size-10 place-items-center rounded-full bg-success/15 text-lg text-success">✓</span>
          <span className="text-base font-semibold">Copied step {n}</span>
          <span className="text-sm text-muted-foreground">{next ? <>Next: <code className="font-mono">{next.cmd}</code></> : 'That’s all four. Your agent knows the scale now.'}</span>
        </div>
      </motion.div>
      {step.sticker && <Shipping rest={6} delay={0.2} className="pointer-events-auto absolute -top-8 right-5 z-(--z-raised) max-sm:hidden" />}
    </li>
  );
}
