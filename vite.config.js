import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/tin': {
        target: 'https://bikol.vm.wmi.amu.edu.pl',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})