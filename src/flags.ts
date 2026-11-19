/**
 * Features built but held back from a release, each switched on by one environment variable.
 *
 * The onboarding page (`plumber` with nothing after it opens a page that asks four questions and writes your rules;
 * overlay/src/lesson.js) is held back from 0.6 (owner, 2026-11-19: "I don't want to release this as part of this
 * release"). Off, `plumber` prints the plain version and the setup steps point at `plumber init`, which asks the same
 * questions in the terminal. `PLUMBER_ONBOARDING=1` turns it on.
 */
export const onboardingPage = (): boolean => process.env.PLUMBER_ONBOARDING === '1';
