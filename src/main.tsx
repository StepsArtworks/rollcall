import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Log that the application is starting
console.log('Application starting...');

// Get the root element
const rootElement = document.getElementById('root');

// Check if the root element exists
if (!rootElement) {
  console.error('Root element not found!');
} else {
  console.log('Root element found, rendering app...');
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}