// Release gate. React Plumber's failures are never the app's errors: the packed package on Vite 8, a fetch-wrapping
// extension in the browser (docs/journey.md 81).
// @tier host
import { test } from 'node:test';
import { appHearsNothing } from './helpers/app-errors.mjs';

test('Vite 8: the app never hears React Plumber fail', { timeout: 300000 }, (t) => appHearsNothing(t, 'vite8'));
