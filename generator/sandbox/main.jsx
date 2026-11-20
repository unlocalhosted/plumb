// The recorder's page: any installed part, by ?part=<key> (stage.jsx renders it).
import { mount } from './stage.jsx';
const entries = import.meta.glob('./parts/*/entry.jsx');
mount(entries[`./parts/${new URLSearchParams(location.search).get('part')}/entry.jsx`]);
