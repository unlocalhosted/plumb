// algorecall's atoms: its review stack as shipped, for the atoms to be cut from (generator/products/algorecall.mjs `atoms`)
import { DueStack } from '@/pages/today/DueStack';
import { mountAtoms } from '../atoms/page.jsx';
import { product } from '../../products/algorecall.mjs';
import { props } from './content.js';
import './atoms.css';
// algorecall's own dark mode is the .dark class; the atoms page asks for it with ?mode=dark
document.documentElement.classList.toggle('dark', new URLSearchParams(location.search).get('mode') === 'dark');
mountAtoms({ Shipped: () => <div className="pg-today"><DueStack {...props} /></div>, product });
