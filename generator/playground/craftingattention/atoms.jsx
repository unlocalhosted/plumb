// crafting attention's atoms: its pricing as shipped, for the atoms to be cut from (generator/products/craftingattention.mjs `atoms`)
import { LifetimePricing } from '@/components/home/pricing/LifetimePricing';
import { mountAtoms } from '../atoms/page.jsx';
import { product } from '../../products/craftingattention.mjs';
import './atoms.css';
mountAtoms({ Shipped: () => <LifetimePricing authenticated={false} initialConfig={{ currency: 'INR' }} />, product });
