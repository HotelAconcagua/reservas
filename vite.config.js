import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // Configura la ruta base para el despliegue en subdirectorios como GitHub Pages
  // Esto asegura que los activos (JS, CSS) se carguen desde la URL correcta
  base: '/reservas/', // ¡Asegúrate de que esta línea esté aquí!
  plugins: [react()],
});