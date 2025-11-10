import { useAuth } from 'react-oidc-context'
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material'

export function SilentRenewPage() {
  const auth = useAuth()
  const renewError = auth.error?.source === 'renewSilent' ? auth.error : null

  return (
    <Box
      component="main"
      sx={{
        bgcolor: 'background.default',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
      }}
    >
      {renewError ? (
        <Alert severity="error" variant="filled">
          {renewError.message ?? 'Errore durante il rinnovo silente del token.'}
        </Alert>
      ) : (
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary">
            Aggiornamento silente del token in corso...
          </Typography>
        </Stack>
      )}
    </Box>
  )
}

