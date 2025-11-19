import Box from '@mui/material/Box'
import { Outlet } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export function AppLayout() {
  const auth = useAuth()
  const showNavbar = auth.isAuthenticated

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#000000',
        color: 'text.primary',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {showNavbar && <Navbar />}
      <Box sx={{ flex: 1 }}>
        <Outlet />
      </Box>
      <Footer />
    </Box>
  )
}
