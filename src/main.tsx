import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App'; // აქ აღარ სჭირდება .tsx და ../
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
