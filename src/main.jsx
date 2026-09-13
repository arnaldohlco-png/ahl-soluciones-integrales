import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Autocurar service workers y caches obsoletos tras una republicación:
// si queda un SW antiguo o caches viejas guardando chunks que ya no existen
// en el servidor, la app no se actualiza en los demás dispositivos. Se
// eliminan en cada carga y se recarga una sola vez para tomar la versión
// vigente. No se vuelve a recargar si no había nada que limpiar.
async function purgeStaleCache() {
  try {
    let needsReload = false;

    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length) {
        await Promise.all(regs.map((r) => r.unregister()));
        needsReload = true;
      }
    }

    if (window.caches) {
      try {
        const keys = await caches.keys();
        if (keys.length) {
          await Promise.all(keys.map((k) => caches.delete(k)));
          needsReload = true;
        }
      } catch (e) { /* ignore */ }
    }

    if (needsReload) {
      sessionStorage.setItem('sw-purged', '1');
      window.location.reload();
    }
  } catch (e) { /* ignore */ }
}

purgeStaleCache();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)