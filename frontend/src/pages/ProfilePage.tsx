import { useEffect, useState, type ChangeEvent, type MouseEventHandler } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Chip,
  FormControlLabel,
  Switch,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import Grid from '@mui/material/GridLegacy'
import { FaCheckCircle, FaEdit, FaSignOutAlt, FaTrashAlt, FaUnlockAlt } from 'react-icons/fa'
import { useAuth } from 'react-oidc-context'
import { appConfig } from '@/config/appConfig'
import {
  useCreateWithdrawalMethodMutation,
  useDeleteWithdrawalMethodMutation,
  usePasswordChangeMutation,
  useWithdrawalMethodsQuery,
  type WithdrawalMethod,
} from '@/api/hooks'
import { useColorVisionMode } from '@/theme/ColorVisionProvider'

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

type WithdrawalFormState = {
  accountHolderName: string
  iban: string
  bic: string
  bankName: string
  isDefault: boolean
}

const defaultWithdrawalForm: WithdrawalFormState = {
  accountHolderName: '',
  iban: '',
  bic: '',
  bankName: '',
  isDefault: false,
}

const maskIban = (value: string) => {
  const cleaned = value.replace(/\s+/g, '')
  if (cleaned.length <= 6) {
    return cleaned
  }
  return `${cleaned.slice(0, 4)}••••${cleaned.slice(-4)}`
}

export function ProfilePage() {
  const auth = useAuth()
  const isAuthenticated = Boolean(auth.isAuthenticated)
  const [passwordForm, setPasswordForm] = useState(defaultPasswordState)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const passwordMutation = usePasswordChangeMutation()

  const [withdrawalForm, setWithdrawalForm] = useState(defaultWithdrawalForm)
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null)
  const [withdrawalSuccess, setWithdrawalSuccess] = useState<string | null>(null)
  const [deletingMethodId, setDeletingMethodId] = useState<string | null>(null)
  const [methodPendingDeletion, setMethodPendingDeletion] = useState<WithdrawalMethod | null>(null)
  const withdrawalMethodsQuery = useWithdrawalMethodsQuery({ enabled: isAuthenticated })
  const createWithdrawalMethod = useCreateWithdrawalMethodMutation()
  const deleteWithdrawalMethod = useDeleteWithdrawalMethodMutation()
  const { mode: colorVisionMode, setMode: setColorVisionMode } = useColorVisionMode()
  const isDaltonicEnabled = colorVisionMode === 'daltonic'

  const profileData = (auth.user?.profile ?? {}) as UserProfile

  const displayName =
    profileData.preferred_username ??
    profileData.name ??
    profileData.given_name ??
    profileData.email ??
    'Utente'

  const subject = profileData.sub ?? 'N/A'
  const holderName = profileData.name ?? profileData.preferred_username ?? profileData.email ?? 'Utente'

  useEffect(() => {
    setWithdrawalForm((prev) => {
      if (prev.accountHolderName === holderName) {
        return prev
      }
      return { ...prev, accountHolderName: holderName }
    })
  }, [holderName])

  const handleLogout = () => {
    void auth
      .signoutRedirect({
        post_logout_redirect_uri: appConfig.oidc.postLogoutRedirectUri,
      })
      .catch((error) => console.error('OIDC logout error', error))
  }

  const handlePasswordChange: MouseEventHandler<HTMLButtonElement> = async (event) => {
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

    try {
      await passwordMutation.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      setPasswordSuccess(true)
      setPasswordForm(defaultPasswordState)
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Impossibile aggiornare la password.')
    }
  }

  const handleWithdrawalSubmit: MouseEventHandler<HTMLButtonElement> = async (event) => {
    event.preventDefault()
    setWithdrawalError(null)
    setWithdrawalSuccess(null)

    if (!withdrawalForm.iban) {
      setWithdrawalError('Inserisci un IBAN valido.')
      return
    }

    try {
      await createWithdrawalMethod.mutateAsync({
        accountHolderName: withdrawalForm.accountHolderName,
        iban: withdrawalForm.iban,
        bic: withdrawalForm.bic || undefined,
        bankName: withdrawalForm.bankName || undefined,
        isDefault: withdrawalForm.isDefault,
      })
      setWithdrawalSuccess('Metodo di prelievo salvato correttamente.')
      setWithdrawalForm((prev) => ({
        ...defaultWithdrawalForm,
        accountHolderName: prev.accountHolderName,
      }))
    } catch (error) {
      setWithdrawalError(
        error instanceof Error ? error.message : 'Impossibile salvare il metodo. Verifica i dati inseriti.',
      )
    }
  }

  const handleWithdrawalDelete = async (methodId: string) => {
    setMethodPendingDeletion(
      withdrawalMethodsQuery.data?.find((method) => method.id === methodId) ?? null,
    )
  }

  const confirmWithdrawalDelete = async () => {
    if (!methodPendingDeletion) {
      return
    }
    setWithdrawalError(null)
    setWithdrawalSuccess(null)
    setDeletingMethodId(methodPendingDeletion.id)
    try {
      await deleteWithdrawalMethod.mutateAsync(methodPendingDeletion.id)
      setWithdrawalSuccess('Metodo di prelievo eliminato correttamente.')
      setMethodPendingDeletion(null)
    } catch (error) {
      setWithdrawalError(
        error instanceof Error ? error.message : 'Impossibile eliminare il metodo selezionato.',
      )
    } finally {
      setDeletingMethodId(null)
    }
  }

  const cancelWithdrawalDelete = () => {
    setMethodPendingDeletion(null)
  }

  const handleColorVisionToggle = (event: ChangeEvent<HTMLInputElement>) => {
    setColorVisionMode(event.target.checked ? 'daltonic' : 'default')
  }


  if (!isAuthenticated) {
    return (
      <Box component="section" sx={{ bgcolor: 'background.default', py: { xs: 4, md: 6 } }}>
        <Container maxWidth="md">
          <Alert severity="info" variant="outlined">
            Effettua l'accesso per visualizzare il tuo profilo.
          </Alert>
        </Container>
      </Box>
    )
  }

  return (
    <Box component="section" sx={{ bgcolor: 'background.default', py: { xs: 4, md: 6 } }}>
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
            <Grid item xs={12} md={12}>
              <Card sx={{ height: '100%', mr: { xs: 2, md: 0 } }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        width: 120,
                        height: 120,
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
              <Card sx={{ height: '100%', mr: { xs: 2, md: 0 } }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack spacing={0}>
                      <Typography variant="overline" color="text.secondary">
                        Tema
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        Modalità grafica
                      </Typography>
                    </Stack>
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    Scegli se utilizzare il tema chiaro oppure quello scuro ad alto contrasto.
                  </Typography>

                  <FormControlLabel
                    control={<Switch checked={isDaltonicEnabled} onChange={handleColorVisionToggle} />}
                    label={isDaltonicEnabled ? 'Tema chiaro' : 'Tema scuro'}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', mr: { xs: 2, md: 0 } }}>
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
                    disabled={passwordMutation.isPending}
                  >
                    {passwordMutation.isPending ? 'Sto aggiornando...' : 'Aggiorna password'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', mr: { xs: 2, md: 0 } }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack spacing={0}>
                      <Typography variant="overline" color="text.secondary">
                        Metodi di prelievo
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        IBAN salvati
                      </Typography>
                    </Stack>
                  </Stack>

                  <Stack spacing={1.5}>
                    {withdrawalMethodsQuery.isLoading ? (
                      <Typography variant="body2" color="text.secondary">
                        Caricamento metodi di prelievo...
                      </Typography>
                    ) : withdrawalMethodsQuery.isError ? (
                      <Alert severity="error" variant="outlined">
                        {withdrawalMethodsQuery.error?.message ?? 'Impossibile recuperare i metodi di prelievo.'}
                      </Alert>
                    ) : withdrawalMethodsQuery.data?.length ? (
                      withdrawalMethodsQuery.data.map((method) => (
                        <Box
                          key={method.id}
                          sx={{
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 2,
                            p: 1.5,
                            bgcolor: 'action.hover',
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack spacing={0.25}>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {maskIban(method.iban)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {method.accountHolderName}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                              {method.isDefault ? <Chip size="small" label="Predefinito" color="primary" /> : null}
                              <Chip
                                size="small"
                                label={method.status}
                                color={method.status === 'VERIFIED' ? 'success' : 'warning'}
                              />
                              <Tooltip title="Elimina metodo">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    aria-label="Elimina metodo di prelievo"
                                    onClick={() => {
                                      void handleWithdrawalDelete(method.id)
                                    }}
                                    disabled={
                                      deleteWithdrawalMethod.isPending && deletingMethodId === method.id
                                    }
                                  >
                                    <FaTrashAlt fontSize="0.85rem" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          </Stack>
                        </Box>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Non hai ancora registrato alcun IBAN di prelievo.
                      </Typography>
                    )}
                  </Stack>

                  <Divider sx={{ my: 1 }} />

                  <Typography variant="body2" color="text.secondary">
                    Aggiungi un conto bancario intestato a te. Le verifiche sono simulate e riceverai un riepilogo via
                    email.
                  </Typography>

                  <Stack spacing={1.25}>
                    <TextField
                      label="Intestatario"
                      size="small"
                      value={withdrawalForm.accountHolderName}
                      disabled
                    />
                    <TextField
                      label="IBAN"
                      size="small"
                      value={withdrawalForm.iban}
                      onChange={(event) =>
                        setWithdrawalForm((prev) => ({ ...prev, iban: event.target.value.toUpperCase() }))
                      }
                      inputProps={{ maxLength: 34 }}
                    />
                    <TextField
                      label="BIC / SWIFT"
                      size="small"
                      value={withdrawalForm.bic}
                      onChange={(event) =>
                        setWithdrawalForm((prev) => ({ ...prev, bic: event.target.value.toUpperCase() }))
                      }
                      inputProps={{ maxLength: 11 }}
                    />
                    <TextField
                      label="Nome banca (opzionale)"
                      size="small"
                      value={withdrawalForm.bankName}
                      onChange={(event) =>
                        setWithdrawalForm((prev) => ({ ...prev, bankName: event.target.value }))
                      }
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={withdrawalForm.isDefault}
                          onChange={(event) =>
                            setWithdrawalForm((prev) => ({ ...prev, isDefault: event.target.checked }))
                          }
                        />
                      }
                      label="Imposta come conto predefinito"
                    />
                    {withdrawalError ? (
                      <Alert severity="error" variant="outlined">
                        {withdrawalError}
                      </Alert>
                    ) : null}
                    {withdrawalSuccess ? (
                      <Alert severity="success" variant="outlined">
                        {withdrawalSuccess}
                      </Alert>
                    ) : null}
                  </Stack>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', px: 3, pb: 3 }}>
                  <Button
                    variant="contained"
                    onClick={handleWithdrawalSubmit}
                    disabled={createWithdrawalMethod.isPending}
                  >
                    {createWithdrawalMethod.isPending ? 'Salvataggio...' : 'Aggiungi metodo'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </Container>

      <Dialog
        open={Boolean(methodPendingDeletion)}
        onClose={cancelWithdrawalDelete}
        aria-labelledby="withdrawal-delete-dialog-title"
      >
        <DialogTitle id="withdrawal-delete-dialog-title">Elimina metodo di prelievo</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            <Typography variant="body2" color="text.secondary" mb={1}>
              Conferma l&apos;eliminazione del seguente IBAN. L’operazione è irreversibile.
            </Typography>
            {methodPendingDeletion ? (
              <Stack spacing={0.5}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {maskIban(methodPendingDeletion.iban)}
                </Typography>
                <Typography variant="body2">{methodPendingDeletion.accountHolderName}</Typography>
                {methodPendingDeletion.bankName ? (
                  <Typography variant="body2" color="text.secondary">
                    {methodPendingDeletion.bankName}
                  </Typography>
                ) : null}
              </Stack>
            ) : null}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={cancelWithdrawalDelete} color="inherit">
            Annulla
          </Button>
          <Button
            startIcon={<FaTrashAlt />}
            color="error"
            variant="contained"
            onClick={confirmWithdrawalDelete}
            disabled={deleteWithdrawalMethod.isPending && Boolean(deletingMethodId)}
          >
            {deleteWithdrawalMethod.isPending && Boolean(deletingMethodId) ? 'Eliminazione...' : 'Elimina'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
