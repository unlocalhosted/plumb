import { createInterface } from 'node:readline';

/** docs/briefs/onboarding.md section 5.2: one question at a time. Enter keeps the recommended answer. */
export interface Question { n: number; of: number; text: string; show?: () => string }
export interface Asker { ask(question: Question): Promise<boolean>; close(): void }

const line = (question: Question, answer: string) => `${question.n}/${question.of}  ${question.text}  ${answer}\n`;
export const asked = (question: Question, yes: boolean) => line(question, yes ? 'yes' : 'skipped');

/** Takes every default and says what it took. For `--yes`, agents and CI. */
export function defaultAsker(print: (text: string) => void): Asker {
  return { async ask(question) { print(line(question, 'yes')); return true; }, close() {} };
}

/** Asks in the terminal. `s` shows the steps, `n` skips, Enter (or the end of input) keeps. */
export function terminalAsker(print: (text: string) => void): Asker {
  const input = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  const lines: string[] = [];
  let ended = false, waiting: ((text: string) => void) | undefined;
  input.on('line', text => { if (waiting) { const done = waiting; waiting = undefined; done(text); } else lines.push(text); });
  input.on('close', () => { ended = true; if (waiting) { const done = waiting; waiting = undefined; done(''); } });
  const next = () => new Promise<string>(done => { if (lines.length) done(lines.shift()!); else if (ended) done(''); else waiting = done; });
  return {
    async ask(question) {
      for (;;) {
        process.stdout.write(`${question.n}/${question.of}  ${question.text}\n     Enter: yes${question.show ? ' · s: show the steps' : ''} · n: skip  `);
        const answer = (await next()).trim().toLowerCase();
        if (!answer || answer === 'y' || answer === 'yes') return true;
        if (answer === 'n' || answer === 'no') return false;
        if (answer === 's' && question.show) { print('\n' + question.show() + '\n'); continue; }
        print('Press Enter to keep, or n to skip.\n');
      }
    },
    close() { input.close(); },
  };
}
