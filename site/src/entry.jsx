import { createRoot } from 'react-dom/client';
import './styles.css';
import { Home } from './Home.jsx';
import { Specimen } from './Specimen.jsx';
import { Systems } from './system/Systems.jsx';
import { Mascots } from './system/Mascots.jsx';
import { DialRoot } from 'dialkit';
import 'dialkit/styles.css';

const page = location.hash === '#primitives' ? <Specimen /> : location.hash === '#systems' ? <Systems /> : location.hash === '#mascots' ? <Mascots /> : <Home />;

createRoot(document.getElementById('root')).render(
  <>
    {page}
    {/* live tuning panels, development only */}
    {import.meta.env.DEV && <DialRoot position="top-right" />}
  </>,
)
