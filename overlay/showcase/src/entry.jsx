// Quarry: the craft showcase (docs/craft/showcase.md). / is the workspace with the mistakes real apps ship;
// /?fixed is the same workspace built right, where the overlay (Alt+B) must have nothing to mark. Each mode loads its
// own sheet of source habits (broken.css or fixed.css), so the habits plumber finds point at broken.css alone.
import { createRoot } from 'react-dom/client';
import './theme.css';
import { Shell } from './Shell.jsx';

const broken = !new URLSearchParams(location.search).has('fixed');
await (broken ? import('./broken.css') : import('./fixed.css'));
createRoot(document.getElementById('root')).render(<Shell broken={broken} />);
