import React from 'react';
import { createRoot } from 'react-dom/client';
import Board from '../../src/screens/Board.jsx';
function Shell() { return <Board />; }
createRoot(document.getElementById('root')).render(<Shell />);
