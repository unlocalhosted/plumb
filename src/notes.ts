import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { statePath } from './paths.js';
import { UsageError } from './errors.js';

/**
 * The person's notes for their agent: written on the page (the X-ray's ↵, about one element), read by the agent with
 * `plumber notes`, and marked done with `plumber notes --done <id>`. They live in .plumber/notes, which is never
 * committed: a note is between one person and their agent, not the team's.
 */
export interface Note { id: string; at: string; text: string; element: string; source: string | null; page: string | null; done?: string }

const directory = (root: string) => statePath(root, 'notes');
const file = (root: string) => join(directory(root), 'notes.json');

export async function readNotes(root: string): Promise<Note[]> {
  try { return JSON.parse(await readFile(file(root), 'utf8')) as Note[]; } catch { return []; }
}
async function writeNotes(root: string, notes: Note[]): Promise<void> {
  await mkdir(directory(root), { recursive: true });
  const ignore = join(directory(root), '.gitignore');
  if (!existsSync(ignore)) await writeFile(ignore, "# notes for your agent: yours, never committed\n*\n");
  // the last 200, done ones dropped first
  const kept = notes.length > 200 ? [...notes.filter(n => !n.done), ...notes.filter(n => n.done)].slice(0, 200) : notes;
  const temp = `${file(root)}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(kept, null, 2)}\n`);
  await rename(temp, file(root));
}

/** The page names a place from the repository's top (`examples/ledger/src/App.jsx:57`); the agent works in the app:
 * the place is said from the app's folder when the file is there. */
function fromRoot(root: string, source: string | null): string | null {
  const at = source ? /^(.*?)(:\d+(?::\d+)?)$/.exec(source) : null;
  if (!at) return source;
  const parts = at[1]!.replaceAll('\\', '/').split('/');
  for (let i = 0; i < parts.length; i++) if (existsSync(join(root, ...parts.slice(i)))) return parts.slice(i).join('/') + at[2];
  return source;
}

export async function addNote(root: string, input: { text?: unknown; element?: unknown; source?: unknown; page?: unknown }): Promise<Note> {
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  if (!text) throw new UsageError('A note needs words.');
  if (text.length > 4000) throw new UsageError('A note is at most 4000 characters.');
  const short = (value: unknown, max: number) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
  const note: Note = { id: `n${randomBytes(2).toString('hex')}`, at: new Date().toISOString(), text, element: short(input.element, 120) ?? 'an element', source: fromRoot(root, short(input.source, 400)), page: short(input.page, 400) };
  await writeNotes(root, [...await readNotes(root), note]);
  return note;
}

export async function doneNote(root: string, id: string): Promise<Note> {
  const notes = await readNotes(root), note = notes.find(n => n.id === id);
  if (!note) throw new UsageError(`No note is called ${id}.\n  → plumber notes`, 'not-found');
  if (!note.done) { note.done = new Date().toISOString(); await writeNotes(root, notes); }
  return note;
}

export const openNotes = async (root: string) => (await readNotes(root)).filter(n => !n.done);

/** The open notes as an agent reads them: what the person asked, and the element's file and line. */
export function formatNotes(notes: Note[]): string {
  if (!notes.length) return 'No notes from the person.\n';
  const lines = [`${notes.length === 1 ? '1 note' : `${notes.length} notes`} from the person, oldest first. Each is about one element on their page.`];
  for (const note of notes) {
    lines.push('', `## ${note.id}  <${note.element}> at ${note.source ?? 'a place plumber could not name (find it on the page)'}`,
      ...note.page ? [`Page: ${note.page}`] : [], `Written: ${new Date(note.at).toLocaleString('sv-SE').slice(0, 16)}`, '', note.text);
  }
  lines.push('', 'Do what each one asks at its place. When one is done: plumber notes --done <id>. If one is unclear, ask the person.');
  return `${lines.join('\n')}\n`;
}
