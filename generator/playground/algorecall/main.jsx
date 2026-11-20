import { DueStack } from '@/pages/today/DueStack';
import { mount } from '../page.jsx';
import { Organism } from './Stack.tsx';
import { props } from './content.js';
import variants from './variants.generated.json';
import './playground.css';
// light, as the app sets it when the learner picks light (index.html removes `dark`)
document.documentElement.classList.remove('dark');
const Shipped = () => <DueStack {...props} />;
const Org = ({ parts }) => <Organism parts={parts} {...props} />;
mount({ Shipped, Organism: Org, variants, wrap: 'pg-today' });
