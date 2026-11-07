import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative asset paths allow the app to work both locally and under
// https://<username>.github.io/<repository>/ on GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [react()],
})
