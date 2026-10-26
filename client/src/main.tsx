import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/600.css';
import '@fontsource/noto-sans-devanagari/700.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TrilingualProvider } from './hooks/useTrilingual';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TrilingualProvider>
      <App />
    </TrilingualProvider>
  </React.StrictMode>
);
