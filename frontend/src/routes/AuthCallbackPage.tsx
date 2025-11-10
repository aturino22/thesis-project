import { useAuth } from 'react-oidc-context'
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material'

export function AuthCallbackPage() {
  const auth = useAuth()
  const callbackError = auth.error?.source === 'signinCallback' ? auth.error : null

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
          <Typography variant="h5" fontWeight={600}>
            Autenticazione in corso
          </Typography>
          {callbackError ? (
            <Alert severity="error" variant="outlined" sx={{ width: '100%' }}>
              {callbackError.message ??
                'Errore durante la gestione del callback OIDC.'}
            </Alert>
          ) : (
            <Stack spacing={2} alignItems="center">
              <CircularProgress color="primary" />
              <Typography variant="body2" color="text.secondary">
                Completiamo il flusso PKCE e ti reindirizziamo alla dashboard.
              </Typography>
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  )
}

