// algorecall's atoms: its review stack as shipped, for the atoms to be cut from (generator/products/algorecall.mjs `atoms`)
import { DueStack } from '@/pages/today/DueStack';
import { mountAtoms } from '../atoms/page.jsx';
import { product } from '../../products/algorecall.mjs';
import { props } from './content.js';
import './atoms.css';
document.documentElement.classList.remove('dark');
mountAtoms({ Shipped: () => <div className="pg-today"><DueStack {...props} /></div>, product });
