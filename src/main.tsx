import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { initializeDatabase, flagExpiredBatches } from '@/db'
import App from '@/App'
import '@/index.css'

// Initialize database and flag expired batches on startup
initializeDatabase()
  .then(() => flagExpiredBatches())
  .catch(console.error)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)

