import { Box, Container, Divider, Typography } from '@mui/material'

export function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        py: 4,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Divider sx={{ mb: 3, borderColor: 'divider' }} />
        <Typography
          variant="body2"
          align="center"
          sx={{
            color: 'text.secondary',
            lineHeight: 1.6,
            maxWidth: '80ch',
            mx: 'auto',
          }}
        >
          Progetto di tesi di <strong>Alessandro Turino</strong> per il corso di laurea L-31 Informatica per le Aziende
          Digitali di <strong>Unipegaso</strong>. Ha uno scopo solo ed esclusivamente didattico.
        </Typography>
        <Typography
          variant="caption"
          align="center"
          display="block"
          sx={{
            color: 'text.secondary',
            mt: 2,
            opacity: 0.7,
          }}
        >
          © {new Date().getFullYear()} Fintech Wallet - Ambiente di simulazione
        </Typography>
      </Container>
    </Box>
  )
}
