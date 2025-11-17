import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import '@/index.css'
import App from '@/App.tsx'
import { OidcProvider } from '@/auth/OidcProvider'
import { ColorVisionThemeProvider } from '@/theme/ColorVisionProvider'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ColorVisionThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <OidcProvider>
            <App />
          </OidcProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ColorVisionThemeProvider>
  </StrictMode>,
)
