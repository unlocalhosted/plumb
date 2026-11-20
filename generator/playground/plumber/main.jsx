import { Plumber } from '@/pages/home/Plumber';
import { mount } from '../page.jsx';
import { Organism } from './Section.tsx';
import variants from './variants.generated.json';
import './playground.css';
mount({ Shipped: Plumber, Organism, variants, wrap: 'mx-auto flex flex-col px-[clamp(1rem,4vw,2.5rem)] max-w-wide' });
