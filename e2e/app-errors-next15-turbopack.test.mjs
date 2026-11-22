// Release gate. React Plumber's failures are never the app's errors: the packed package on Next 15 with turbopack, a
// fetch-wrapping extension in the browser (docs/journey.md 81).
// @tier host
import { test } from 'node:test';
import { appHearsNothing } from './helpers/app-errors.mjs';

test('Next 15 turbopack: the app never hears React Plumber fail', { timeout: 330000 }, (t) => appHearsNothing(t, 'next15', 'turbopack'));
