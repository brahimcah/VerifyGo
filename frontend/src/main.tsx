import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import DriverApp from './components/DriverApp.tsx';
import './index.css';

const isDriver = window.location.pathname.startsWith('/driver');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDriver ? <DriverApp /> : <App />}
  </StrictMode>,
);
