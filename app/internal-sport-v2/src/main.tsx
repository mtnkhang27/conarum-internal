import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/index.css'
import App from './App.tsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queryClient'
import { FioriThemeProvider } from './contexts/FioriThemeContext.tsx'
import { initFLPMessageListener } from './hooks/useFLPSync'

// Initialize FLP message listener for iframe communication
initFLPMessageListener();

createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}>
        <FioriThemeProvider>
            <App />
        </FioriThemeProvider>
    </QueryClientProvider>
)
