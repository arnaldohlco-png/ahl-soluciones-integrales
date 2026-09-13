import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Autocurar service workers obsoletos tras una republicación: si queda un SW
// antiguo guardando chunks que ya no existen en el servidor, la app queda en
// blanco en PC. Se eliminan una vez por sesión y se recarga para tomar la
// versión vigente.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    if (regs.length && !sessionStorage.getItem('sw-cleaned')) {
      sessionStorage.setItem('sw-cleaned', '1');
      Promise.all(regs.map((r) => r.unregister())).then(() => window.location.reload());
    }
  }).catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)