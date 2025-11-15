import { useState, type MouseEventHandler } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Container,
  Divider,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import Grid from '@mui/material/GridLegacy'
import { FaCheckCircle, FaEdit, FaSignOutAlt, FaUnlockAlt } from 'react-icons/fa'
import { useAuth } from 'react-oidc-context'
import { appConfig } from '@/config/appConfig'

type UserProfile = {
  preferred_username?: string
  name?: string
  given_name?: string
  email?: string
  locale?: string
  sub?: string
}

const profileFields: Array<{
  label: string
  value: (profile: UserProfile, subject: string) => string | undefined
  monospaced?: boolean
}> = [
  { label: 'Nome completo', value: (profile) => profile.name },
  { label: 'Username', value: (profile) => profile.preferred_username },
  { label: 'Email', value: (profile) => profile.email },
  { label: 'Locale', value: (profile) => profile.locale },
  { label: 'Soggetto (sub)', value: (_profile, subject) => subject, monospaced: true },
]

type PasswordFormState = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const defaultPasswordState: PasswordFormState = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

export function ProfilePage() {
  const auth = useAuth()
  const isAuthenticated = Boolean(auth.isAuthenticated)
  const [passwordForm, setPasswordForm] = useState(defaultPasswordState)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const profileData = (auth.user?.profile ?? {}) as UserProfile

  const displayName =
    profileData.preferred_username ??
    profileData.name ??
    profileData.given_name ??
    profileData.email ??
    'Utente'

  const subject = profileData.sub ?? 'N/A'

  const handleLogout = () => {
    void auth
      .signoutRedirect({
        post_logout_redirect_uri: appConfig.oidc.postLogoutRedirectUri,
      })
      .catch((error) => console.error('OIDC logout error', error))
  }

  const handlePasswordChange: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault()
    setPasswordError(null)

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Le password non coincidono.')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('La nuova password deve avere almeno 8 caratteri.')
      return
    }

    setPasswordSubmitting(true)
    setPasswordSuccess(false)

    // TODO: replace with real API integration once backend exposes password-change endpoint.
    setTimeout(() => {
      setPasswordSubmitting(false)
      setPasswordSuccess(true)
      setPasswordForm(defaultPasswordState)
    }, 1200)
  }

  if (!isAuthenticated) {
    return (
      <Box component="section" sx={{ py: { xs: 4, md: 6 } }}>
        <Container maxWidth="md">
          <Alert severity="info" variant="outlined">
            Effettua l'accesso per visualizzare il tuo profilo.
          </Alert>
        </Container>
      </Box>
    )
  }

  return (
    <Box component="section" sx={{ py: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <div>
            <Typography variant="overline" color="text.secondary">
              Account
            </Typography>
            <Typography variant="h3" fontWeight={700}>
              Profilo personale
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Gestisci le informazioni recuperate dal token OIDC e aggiorna la tua password da qui.
            </Typography>
          </div>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        fontSize: '2rem',
                        fontWeight: 600,
                      }}
                    >
                      {displayName[0]?.toUpperCase() ?? 'U'}
                    </Avatar>
                    <div>
                      <Typography variant="h5" fontWeight={700}>
                        {displayName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {profileData.email ?? 'Email non disponibile'}
                      </Typography>
                    </div>
                  </Stack>
                  <Divider />
                  <Stack spacing={1}>
                    {profileFields.map((field) => {
                      const value =
                        typeof field.value === 'function'
                          ? field.value(profileData, subject)
                          : (profileData[field.value as keyof typeof profileData] as string | undefined)
                      if (!value) {
                        return null
                      }
                      return (
                        <Box key={field.label}>
                          <Typography variant="overline" color="text.secondary" letterSpacing={1}>
                            {field.label.toUpperCase()}
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{
                              fontFamily: field.monospaced ? 'var(--mui-fontFamily-code)' : undefined,
                              wordBreak: 'break-word',
                            }}
                          >
                            {value}
                          </Typography>
                        </Box>
                      )
                    })}
                  </Stack>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', px: 3, pb: 3 }}>
                  <Button variant="outlined" startIcon={<FaEdit />} disabled>
                    Modifica profilo
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<FaSignOutAlt />}
                    onClick={handleLogout}
                  >
                    Esci
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack spacing={0}>
                      <Typography variant="overline" color="text.secondary">
                        Sicurezza
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        Aggiorna password
                      </Typography>
                    </Stack>
                    {passwordSuccess ? (
                      <Chip size="small" color="success" icon={<FaCheckCircle />} label="Aggiornata" sx={{ fontWeight: 600 }} />
                    ) : null}
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    Utilizza una password forte con almeno 8 caratteri, includendo lettere maiuscole, minuscole e simboli.
                    L'aggiornamento invaliderà tutte le sessioni attive.
                  </Typography>

                  <Stack spacing={1.5} component="form">
                    <TextField
                      type="password"
                      label="Password attuale"
                      value={passwordForm.currentPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                      }
                      fullWidth
                      size="small"
                      required
                    />
                    <TextField
                      type="password"
                      label="Nuova password"
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                      }
                      fullWidth
                      size="small"
                      required
                    />
                    <TextField
                      type="password"
                      label="Conferma nuova password"
                      value={passwordForm.confirmPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                      }
                      fullWidth
                      size="small"
                      required
                    />
                    {passwordError ? (
                      <Alert severity="error" variant="outlined">
                        {passwordError}
                      </Alert>
                    ) : null}
                  </Stack>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', px: 3, pb: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<FaUnlockAlt />}
                    onClick={handlePasswordChange}
                    disabled={passwordSubmitting}
                  >
                    {passwordSubmitting ? 'Sto aggiornando...' : 'Aggiorna password'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  )
}



