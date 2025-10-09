import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

import './index.css'
import './css/react-grid-layout.css'
import './css/react-resizable.css'

import { ThemeProvider } from "@/components/theme/theme-provider"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <App />
    </ThemeProvider>
  </StrictMode>,
)
