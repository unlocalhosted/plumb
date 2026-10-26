import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App.jsx';
import { Craft } from './Craft.jsx';

createRoot(document.getElementById('root')).render(new URLSearchParams(location.search).has('craft') ? <Craft /> : <App />);
