// React Plumber's atoms: its section on craftingui.com as shipped, for the atoms to be cut from (generator/products/plumber.mjs `atoms`)
import { Plumber } from '@/pages/home/Plumber';
import { mountAtoms } from '../atoms/page.jsx';
import { product } from '../../products/plumber.mjs';
import './atoms.css';
mountAtoms({ Shipped: () => <div className="mx-auto max-w-wide"><Plumber /></div>, product });
