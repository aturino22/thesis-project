import { useState, type MouseEventHandler } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'
import Grid from '@mui/material/GridLegacy'
import { FaRocket, FaSignInAlt } from 'react-icons/fa'
import { appConfig } from '@/config/appConfig'

const experienceTags = ['Trading crypto in tempo reale', 'Ricariche e prelievi istantanei', 'Quotazioni live']
const DISCLAIMER_MESSAGE =
  'Il portafoglio che stai utilizzando è nato come progetto universitario a fini didattici. Tutte le operazioni mostrate sono simulate: acquisti, vendite e transazioni non generano movimenti di denaro reale né effetti finanziari.'

type ShowcaseHighlight = {
  title: string
  description: string
  image: string
  alt: string
  accent: string
}

const showcaseHighlights: ShowcaseHighlight[] = [
  {
    title: 'Portafoglio Crypto',
    description:
      'Acquista e vendi criptovalute in pochi click con un sistema di trading intuitivo e sicuro. Monitora le tue posizioni con valutazione in tempo reale basata su quotazioni live da CoinCap API. Gestisci il tuo portfolio crypto direttamente dalla dashboard con visualizzazione aggregata per ticker, calcolo automatico del valore in EUR e storico completo delle operazioni. Ogni ordine di acquisto o vendita aggiorna atomicamente sia il saldo del conto che la quantità detenuta, garantendo consistenza dei dati.',
    image: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=1200&q=80',
    alt: 'Dashboard crypto con grafici di trading',
    accent: '#1ED760',
  },
  {
    title: 'Ricariche e Prelievi',
    description:
      'Ricarica il tuo conto in modo istantaneo con simulazione di pagamento tramite carta. Richiedi prelievi bancari sicuri verso IBAN verificati con sistema di frozen funds che blocca temporaneamente i fondi durante l\'elaborazione. Tutte le operazioni sono tracciate con audit trail completo che registra IP, User-Agent e timestamp. I prelievi richiedono autenticazione a due fattori (MFA) per garantire Strong Customer Authentication conforme a PSD2. Il sistema calcola automaticamente le fee (1% con minimo €2) e genera reference univoci per ogni operazione.',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80',
    alt: 'Operazioni bancarie sicure',
    accent: '#7C4DFF',
  },
  {
    title: 'Quotazioni Real-Time',
    description:
      'Visualizza i prezzi aggiornati degli asset crypto con variazioni percentuali 24h, capitalizzazione di mercato e volume di scambio. I dati provengono in tempo reale da CoinCap API v2, garantendo informazioni accurate per decisioni di trading informate. La dashboard market mostra una lista completa di asset disponibili con prezzi live, permettendo di esplorare opportunità di investimento. Ogni asset ha una pagina di dettaglio con storico prezzi e informazioni complete per analisi approfondite prima dell\'acquisto.',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
    alt: 'Grafici di mercato in tempo reale',
    accent: '#F1C40F',
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
  const [disclaimerOpen, setDisclaimerOpen] = useState(true)

  const acknowledgeDisclaimer = () => setDisclaimerOpen(false)

  return (
    <>
      <Dialog
        open={disclaimerOpen}
        aria-labelledby="disclaimer-dialog-title"
        aria-describedby="disclaimer-dialog-description"
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown
        onClose={(_, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            return
          }
        }}
      >
        <DialogTitle id="disclaimer-dialog-title">Avviso importante</DialogTitle>
        <DialogContent dividers id="disclaimer-dialog-description">
          <Typography variant="body1">{DISCLAIMER_MESSAGE}</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={acknowledgeDisclaimer}>
            Ho capito
          </Button>
        </DialogActions>
      </Dialog>
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
                  icon={<FaRocket size={14} />}
                  label="Wallet digitale evoluto"
                  variant="outlined"
                  sx={{
                    fontWeight: 700,
                    px: 0.5,
                    borderColor: 'rgba(0, 200, 83, 0.6)',
                    color: '#1ED760',
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
                Wallet digitale che ti permette di{' '}
                <Box component="span" sx={{ color: '#1ED760', fontWeight: 700 }}>
                  gestire conti, tradare crypto e monitorare il mercato
                </Box>{' '}
                in tempo reale. Ricariche istantanee, prelievi sicuri con MFA e quotazioni live per decisioni di investimento informate.
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="contained"
                size="large"
                startIcon={<FaSignInAlt />}
                onClick={onLogin}
                disabled={authenticating}
                sx={{
                  backgroundColor: '#1ED760',
                  color: '#041704',
                  fontWeight: 700,
                  px: 3,
                  '&:hover': { backgroundColor: '#00b84d' },
                }}
              >
                Accedi
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
              background: 'linear-gradient(135deg, #020202 0%, #041704 50%, #1ED760 100%)',
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
                Tutto ciò che ti serve per gestire crypto e conti digitali
              </Typography>
              <Typography variant="body1" sx={{ maxWidth: 720, color: 'rgba(255,255,255,0.85)' }}>
                Acquista e vendi criptovalute con quotazioni real-time, ricarica il tuo conto istantaneamente e richiedi prelievi bancari protetti da autenticazione a due fattori. La piattaforma combina trading crypto, gestione conti multi-valuta e operazioni bancarie in un ambiente sicuro e intuitivo.
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

          <Stack spacing={4}>
            {showcaseHighlights.map((feature, index) => {
              const isEven = index % 2 === 0
              const accentForeground = feature.accent === '#0B0B0B' ? '#F1C40F' : '#041704'
              
              return (
                <Box
                  key={feature.title}
                  sx={{
                    borderRadius: 5,
                    background: `linear-gradient(135deg, #020202 0%, ${feature.accent}15 100%)`,
                    color: '#F4FFE3',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      width: 300,
                      height: 300,
                      background: `radial-gradient(circle, ${feature.accent}40 0%, transparent 70%)`,
                      top: -100,
                      [isEven ? 'right' : 'left']: -100,
                      display: { xs: 'none', md: 'block' },
                    }}
                  />
                  
                  <Grid container spacing={0}>
                    <Grid 
                      item 
                      xs={12} 
                      md={6} 
                      order={{ xs: 1, md: isEven ? 1 : 2 }}
                    >
                      <Box
                        sx={{
                          position: 'relative',
                          height: { xs: 280, md: 400 },
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          component="img"
                          src={feature.image}
                          alt={feature.alt}
                          loading="lazy"
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: 'saturate(1.1) brightness(0.9)',
                          }}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)',
                          }}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 20,
                            [isEven ? 'right' : 'left']: 20,
                            width: 60,
                            height: 60,
                            borderRadius: '50%',
                            backgroundColor: feature.accent,
                            boxShadow: `0 0 40px ${feature.accent}`,
                            border: '3px solid rgba(255,255,255,0.2)',
                            display: { xs: 'none', md: 'block' },
                          }}
                        />
                      </Box>
                    </Grid>
                    
                    <Grid 
                      item 
                      xs={12} 
                      md={6} 
                      order={{ xs: 2, md: isEven ? 2 : 1 }}
                    >
                      <Stack
                        spacing={3}
                        sx={{
                          p: { xs: 3, md: 5 },
                          height: '100%',
                          justifyContent: 'center',
                          position: 'relative',
                          textAlign: { xs: 'left', md: isEven ? 'left' : 'right' },
                        }}
                      >
                        <Chip
                          label={feature.title}
                          sx={{
                            alignSelf: { xs: 'flex-start', md: isEven ? 'flex-start' : 'flex-end' },
                            fontWeight: 700,
                            backgroundColor: feature.accent,
                            color: accentForeground,
                            borderRadius: 999,
                            px: 2.5,
                            py: 0.5,
                            fontSize: '0.95rem',
                          }}
                        />
                        
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            color: 'rgba(255,255,255,0.85)', 
                            lineHeight: 1.7,
                            maxWidth: { xs: '100%', md: '90%' },
                            mx: { xs: 0, md: isEven ? 0 : 'auto' },
                            mr: { xs: 0, md: isEven ? 0 : 0 },
                            ml: { xs: 0, md: isEven ? 0 : 'auto' },
                          }}
                        >
                          {feature.description}
                        </Typography>
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>
              )
            })}
          </Stack>
        </Stack>
      </Container>
    </Box>
  </>
  )
}



