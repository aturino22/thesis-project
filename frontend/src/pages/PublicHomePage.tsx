import type { MouseEventHandler } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Stack,
  Typography,
} from '@mui/material'
import Grid from '@mui/material/GridLegacy'
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded'
import LoginRoundedIcon from '@mui/icons-material/LoginRounded'
import { appConfig } from '@/config/appConfig'

const experienceTags = ['Bonifici in tempo reale', 'Carte virtuali tokenizzate', 'Investimenti globali']

type ShowcaseHighlight = {
  title: string
  description: string
  image: string
  alt: string
  accent: string
}

const showcaseHighlights: ShowcaseHighlight[] = [
  {
    title: 'Portafoglio multi-valuta',
    description:
      "Gestisci conti internazionali, limiti personalizzati e notifiche istantanee in tempo reale da un'unica dashboard.",
    image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&w=1000&q=80',
    alt: 'Anteprima mobile di un portafoglio digitale',
    accent: '#00C853',
  },
  {
    title: 'Trading e risparmio smart',
    description:
      'Apri posizioni, automatizza piani di accumulo e monitora performance live con grafici dinamici e alert push.',
    image: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1000&q=80',
    alt: 'Dashboard di trading con grafici luminosi',
    accent: '#F1C40F',
  },
  {
    title: 'Pagamenti premium',
    description:
      'Crea carte virtuali temporanee, connetti wallet mobile e approva pagamenti con controlli biometrici.',
    image: 'https://images.unsplash.com/photo-1488998527040-85054a85150e?auto=format&fit=crop&w=1000&q=80',
    alt: 'Utente che paga con smartphone contactless',
    accent: '#0B0B0B',
  },
]

type PublicHomePageProps = {
  loading: boolean
  authenticating: boolean
  onLogin: MouseEventHandler<HTMLButtonElement>
  showMockedAuthChip: boolean
  errorMessage?: string
}

export function PublicHomePage({
  loading,
  authenticating,
  onLogin,
  showMockedAuthChip,
  errorMessage,
}: PublicHomePageProps) {
  return (
    <Box component="main" sx={{ bgcolor: '#000000', minHeight: '100vh', py: { xs: 6, md: 10 } }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 6, md: 8 }}>
          <Stack spacing={3}>
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
              >
                <Chip
                  icon={<RocketLaunchRoundedIcon fontSize="small" />}
                  label="Wallet digitale evoluto"
                  variant="outlined"
                  sx={{
                    fontWeight: 700,
                    px: 0.5,
                    borderColor: 'rgba(0, 200, 83, 0.6)',
                    color: '#00C853',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  }}
                />
                {loading && (
                  <Chip
                    label="Sincronizzazione sessione..."
                    color="secondary"
                    variant="outlined"
                    sx={{ fontWeight: 500 }}
                  />
                )}
              </Stack>
              <Typography variant="h3" component="h1">
                {appConfig.appName}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  maxWidth: { xs: '100%', md: '65ch' },
                  color: 'rgba(255, 255, 255, 0.85)',
                }}
              >
                Piattaforma di digital banking che ti permette di{' '}
                <Box component="span" sx={{ color: '#00C853', fontWeight: 700 }}>
                  muovere capitali, investire e pagare
                </Box>{' '}
                con una sola app: controlli biometrici, alert istantanei e gestione multi-valuta pensata per utenti
                premium e team finance distributed.
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="contained"
                size="large"
                startIcon={<LoginRoundedIcon />}
                onClick={onLogin}
                disabled={authenticating}
                sx={{
                  backgroundColor: '#00C853',
                  color: '#041704',
                  fontWeight: 700,
                  px: 3,
                  '&:hover': { backgroundColor: '#00b84d' },
                }}
              >
                Accedi con Keycloak
              </Button>
              {showMockedAuthChip ? (
                <Chip label="Mocked auth attiva" color="warning" variant="outlined" size="small" sx={{ fontWeight: 600 }} />
              ) : null}
            </Stack>
          </Stack>

          {errorMessage ? (
            <Alert severity="error" variant="outlined">
              {errorMessage}
            </Alert>
          ) : null}

          <Box
            sx={{
              borderRadius: 5,
              background: 'linear-gradient(135deg, #020202 0%, #041704 50%, #00C853 100%)',
              color: '#F4FFE3',
              px: { xs: 3, md: 6 },
              py: { xs: 4, md: 6 },
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                width: 260,
                height: 260,
                background: 'radial-gradient(circle, rgba(241, 196, 15, 0.4) 0%, transparent 70%)',
                top: -80,
                right: -60,
              }}
            />
            <Stack spacing={3} position="relative">
              <Typography variant="overline" sx={{ letterSpacing: 3, color: '#F1C40F', fontWeight: 700 }}>
                Esperienza pubblica
              </Typography>
              <Typography variant="h4" component="h2" sx={{ maxWidth: 720, fontWeight: 700 }}>
                Tutto cio che ti serve per muovere e far crescere il capitale digitale
              </Typography>
              <Typography variant="body1" sx={{ maxWidth: 720, color: 'rgba(255,255,255,0.85)' }}>
                Pianifica spese, investi in tempo reale e proteggi le tue carte con controlli biometrici e AI antifrode. La
                piattaforma combina operativita banking, trading e cash management in un ambiente ultra reattivo e sicuro.
              </Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                {experienceTags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    sx={{
                      bgcolor: 'rgba(0, 0, 0, 0.65)',
                      border: '1px solid rgba(241, 196, 15, 0.7)',
                      color: '#F1C40F',
                      fontWeight: 600,
                      borderRadius: 999,
                    }}
                  />
                ))}
              </Stack>
            </Stack>
          </Box>

          <Grid container spacing={3}>
            {showcaseHighlights.map((feature) => {
              const accentForeground = feature.accent === '#0B0B0B' ? '#F1C40F' : '#041704'
              return (
                <Grid key={feature.title} item xs={12} md={4}>
                  <Card
                    sx={{
                      height: '100%',
                      borderRadius: 4,
                      color: 'text.primary',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      backgroundColor: 'background.paper',
                    }}
                  >
                    <Box sx={{ position: 'relative', height: 220, overflow: 'hidden' }}>
                      <Box
                        component="img"
                        src={feature.image}
                        alt={feature.alt}
                        loading="lazy"
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          filter: 'saturate(1.1)',
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.75) 100%)',
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 16,
                          right: 16,
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          backgroundColor: feature.accent,
                          boxShadow: `0 0 32px ${feature.accent}`,
                          border: '2px solid rgba(255,255,255,0.15)',
                        }}
                      />
                    </Box>
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Chip
                        label={feature.title}
                        sx={{
                          alignSelf: 'flex-start',
                          fontWeight: 700,
                          backgroundColor: feature.accent,
                          color: accentForeground,
                          borderRadius: 999,
                        }}
                      />
                      <Typography variant="body1" fontWeight={600}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </Stack>
      </Container>
    </Box>
  )
}
