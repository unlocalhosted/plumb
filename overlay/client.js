import { locate } from './src/locate.js';
const script = [...document.querySelectorAll('script[type="module"][src]')].find(script => script.src === import.meta.url);
const base = new URL('./', import.meta.url).href;
const token = script?.dataset.plumbToken;
window.__plumb = { locate, async site(element) {
  const location = await locate(element);
  if (!location) return null;
  const url = new URL('site', base);
  for (const key of ['file', 'line', 'column']) url.searchParams.set(key, location[key]);
  const response = await fetch(url, { headers: token ? { 'x-plumb-token': token } : {} });
  return response.ok ? response.json() : null;
} };
console.debug('[plumb] overlay connected', await (await fetch(base + 'health', {
  headers: token ? { 'x-plumb-token': token } : {},
})).json());
