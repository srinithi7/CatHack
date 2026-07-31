import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vite only exposes import.meta.env vars prefixed VITE_ by default;
  // the Firebase config is supplied as REACT_APP_* per the ops team's spec.
  envPrefix: ["VITE_", "REACT_APP_"],
})
