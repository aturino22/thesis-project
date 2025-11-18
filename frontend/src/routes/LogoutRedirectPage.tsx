import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { appConfig } from '@/config/appConfig'

export function LogoutRedirectPage() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate(appConfig.routes.home, { replace: true })
  }, [navigate])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        textAlign: 'center',
        px: 2,
      }}
    >
      <CircularProgress color="primary" />
      <Typography variant="h6" component="p">
        Reindirizzamento alla homepage...
      </Typography>
    </Box>
  )
}
