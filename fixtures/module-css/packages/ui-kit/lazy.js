export const lazy = () => import('./dynamic.js');
// import './unreachable.css';
const example = "import './unreachable.css'";
const pattern = /import\('.\/unreachable.css'\)/;
