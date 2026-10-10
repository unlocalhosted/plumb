const script = [...document.querySelectorAll('script[type="module"][src]')].find(script => script.src === import.meta.url);
const base = new URL('./', import.meta.url).href;
const token = script?.dataset.plumbToken;
console.debug('[plumb] overlay connected', await (await fetch(base + 'health', {
  headers: token ? { 'x-plumb-token': token } : {},
})).json());
