import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App.jsx';
import { Craft } from './Craft.jsx';
import { Team } from './Team.jsx';
import { Rules } from './Rules.jsx';

const query = new URLSearchParams(location.search);
createRoot(document.getElementById('root')).render(query.has('craft') ? <Craft /> : query.has('rules') ? <Rules /> : query.has('team') ? <Team /> : <App />);
