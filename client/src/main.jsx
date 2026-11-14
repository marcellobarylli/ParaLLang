import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { useGameStore } from './stores/useGameStore.js';
import './index.css';

// For the console and the screenshot script (client/scripts/dungeon-shots.mjs).
window.__parallang = { store: useGameStore };

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
