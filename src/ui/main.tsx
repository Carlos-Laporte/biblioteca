import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/800.css';
import './estilos/tokens.css';
import './estilos/base.css';
import './estilos/componentes.css';
import { App } from './App';
import { ProvedorToast } from './componentes/Toast';

const raiz = document.getElementById('root');
if (raiz) {
  createRoot(raiz).render(
    <StrictMode>
      <BrowserRouter>
        <ProvedorToast>
          <App />
        </ProvedorToast>
      </BrowserRouter>
    </StrictMode>,
  );
}
