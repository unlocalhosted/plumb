import { Wall } from '@/pages/home/Wall';
import { mount } from '../page.jsx';
import { Organism } from './Wall.jsx';
import variants from './variants.generated.json';
import './playground.css';
mount({ Shipped: Wall, Organism, variants, wrap: 'mx-auto flex flex-col px-[clamp(1rem,4vw,2.5rem)] max-w-wide' });
