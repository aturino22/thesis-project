import { Box, Button, Container, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import { appConfig } from '@/config/appConfig'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Box
      component="main"
      sx={{
        bgcolor: 'background.default',
        minHeight: '100vh',
        py: { xs: 6, md: 10 },
      }}
    >
      <Container maxWidth="sm">
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Typography variant="h3" fontWeight={600}>
            Pagina non trovata
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Il percorso richiesto non esiste. Torna alla dashboard per continuare a lavorare
            sull&apos;interfaccia Material Design.
          </Typography>
          <Button
            variant="contained"
            startIcon={<HomeRoundedIcon />}
            onClick={() => navigate(appConfig.routes.home)}
          >
            Torna alla home
          </Button>
        </Stack>
      </Container>
    </Box>
  )
}

