import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { StatsEditor } from './StatsEditor';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StatsEditor />
  </StrictMode>
);
