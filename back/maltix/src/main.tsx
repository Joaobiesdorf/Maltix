import React from 'react';
import { createRoot } from 'react-dom/client';
import MaltixApp from './MaltixApp';
import './biesdorf.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MaltixApp />
  </React.StrictMode>,
);
