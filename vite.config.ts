import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
// https://mayakhalil-cmd.github.io/rico-website/
export default defineConfig({
  plugins: [react()],
  base: './',
})
