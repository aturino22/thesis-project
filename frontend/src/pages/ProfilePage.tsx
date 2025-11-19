import { useEffect, useRef, useState, type ChangeEvent, type MouseEventHandler } from 'react'
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
import { FaCheckCircle, FaEdit, FaTrashAlt, FaUnlockAlt } from 'react-icons/fa'
import { useAuth } from 'react-oidc-context'
import { appConfig } from '@/config/appConfig'
import {
  useCreateWithdrawalMethodMutation,
  useDeleteWithdrawalMethodMutation,
  usePasswordChangeMutation,
  useProfileDeleteMutation,
  useProfileUpdateMutation,
  useWithdrawalMethodsQuery,
  type WithdrawalMethod,
} from '@/api/hooks'
import { OtpVerificationDialog } from '@/components/OtpVerificationDialog'
import { getStoredMfaSessionExpiry, isMfaSessionStillValid, storeMfaSessionExpiry } from '@/utils/mfaSession'
import { useColorVisionMode } from '@/theme/ColorVisionProvider'

type UserProfile = {
  preferred_username?: string
  name?: string
  given_name?: string
  family_name?: string
  email?: string
  locale?: string
  sub?: string
}


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
  const profileUpdateMutation = useProfileUpdateMutation()
  const profileDeleteMutation = useProfileDeleteMutation()
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
  })
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
  const [otpDialogOpen, setOtpDialogOpen] = useState(false)
  const [otpSessionExpiresAt, setOtpSessionExpiresAt] = useState<string | null>(null)
  const pendingOtpActionRef = useRef<(() => Promise<void>) | null>(null)

  const profileData = (auth.user?.profile ?? {}) as UserProfile

  const displayName =
    profileData.preferred_username ??
    profileData.name ??
    profileData.given_name ??
    profileData.email ??
    'Utente'

  const holderName = profileData.name ?? profileData.preferred_username ?? profileData.email ?? 'Utente'

  useEffect(() => {
    setWithdrawalForm((prev) => {
      if (prev.accountHolderName === holderName) {
        return prev
      }
      return { ...prev, accountHolderName: holderName }
    })
  }, [holderName])

  useEffect(() => {
    if (!isAuthenticated) {
      setOtpDialogOpen(false)
      return
    }
    if (isMfaSessionStillValid()) {
      setOtpSessionExpiresAt(getStoredMfaSessionExpiry())
      setOtpDialogOpen(false)
    } else {
      setOtpDialogOpen(true)
    }
  }, [isAuthenticated])

  const executeWithOtpGuard = async (action: () => Promise<void>) => {
    if (!isMfaSessionStillValid()) {
      pendingOtpActionRef.current = action
      setOtpDialogOpen(true)
      return
    }
    pendingOtpActionRef.current = null
    await action()
  }

  const handleOtpVerified = (expiresAt: string) => {
    setOtpSessionExpiresAt(expiresAt)
    storeMfaSessionExpiry(expiresAt)
    setOtpDialogOpen(false)
    const pendingAction = pendingOtpActionRef.current
    pendingOtpActionRef.current = null
    if (pendingAction) {
      void pendingAction()
    }
  }

  const handleOtpDialogClose = () => {
    setOtpDialogOpen(false)
    pendingOtpActionRef.current = null
  }

  const resetProfileForm = () => {
    setProfileForm({
      firstName: profileData.given_name ?? '',
      lastName: profileData.family_name ?? '',
      email: profileData.email ?? '',
    })
  }

  useEffect(() => {
    resetProfileForm()
  }, [profileData.given_name, profileData.family_name, profileData.email])

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

    const submitPasswordChange = async () => {
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

    await executeWithOtpGuard(submitPasswordChange)
  }

  const handleWithdrawalSubmit: MouseEventHandler<HTMLButtonElement> = async (event) => {
    event.preventDefault()
    setWithdrawalError(null)
    setWithdrawalSuccess(null)

    if (!withdrawalForm.iban) {
      setWithdrawalError('Inserisci un IBAN valido.')
      return
    }

    const submitWithdrawalMethod = async () => {
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

    await executeWithOtpGuard(submitWithdrawalMethod)
  }

  const handleProfileSubmit: MouseEventHandler<HTMLButtonElement> = async (event) => {
    event.preventDefault()
    setProfileError(null)
    setProfileSuccess(false)
    const normalizedFirstName = profileForm.firstName.trim()
    const normalizedLastName = profileForm.lastName.trim()
    const normalizedEmail = profileForm.email.trim()
    const payload: { firstName?: string; lastName?: string; email?: string } = {}
    if (normalizedFirstName && normalizedFirstName !== (profileData.given_name ?? '')) {
      payload.firstName = normalizedFirstName
    }
    if (normalizedLastName && normalizedLastName !== (profileData.family_name ?? '')) {
      payload.lastName = normalizedLastName
    }
    const currentEmail = profileData.email ?? ''
    const emailChanged = Boolean(normalizedEmail) && normalizedEmail !== currentEmail
    if (emailChanged) {
      payload.email = normalizedEmail
    }

    const submitProfileUpdate = async () => {
      try {
        await profileUpdateMutation.mutateAsync(payload)
        setProfileSuccess(true)
        setIsEditingProfile(false)
      } catch (error) {
        setProfileError(error instanceof Error ? error.message : 'Impossibile aggiornare il profilo.')
      }
    }

    if (emailChanged) {
      await executeWithOtpGuard(submitProfileUpdate)
      return
    }

    pendingOtpActionRef.current = null
    await submitProfileUpdate()
  }

  const handleProfileEditToggle = () => {
    setProfileSuccess(false)
    setProfileError(null)
    setIsEditingProfile(true)
  }

  const handleProfileCancel = () => {
    resetProfileForm()
    setProfileError(null)
    setProfileSuccess(false)
    setIsEditingProfile(false)
  }

  const handleOpenDeleteDialog = () => {
    setDeletePassword('')
    setDeleteError(null)
    setIsDeleteDialogOpen(true)
  }

  const handleCloseDeleteDialog = () => {
    if (!profileDeleteMutation.isPending) {
      setIsDeleteDialogOpen(false)
    }
  }

  const handleConfirmDelete = async () => {
    setDeleteError(null)
    try {
      await profileDeleteMutation.mutateAsync({ currentPassword: deletePassword })
      setIsDeleteDialogOpen(false)
      handleLogout()
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Password non corretta.')
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

          <Grid container rowSpacing={3} columnSpacing={{ xs: 0, md: 3 }}>
            <Grid item xs={12} md={12}>
              <Card sx={{ height: '100%' }}>
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
                      {(profileForm.firstName || displayName)[0]?.toUpperCase() ?? 'U'}
                    </Avatar>
                    <div>
                      <Typography variant="h5" fontWeight={700}>
                        {[profileForm.firstName, profileForm.lastName].filter(Boolean).join(' ') || displayName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {profileForm.email || 'Email non disponibile'}
                      </Typography>
                    </div>
                  </Stack>
                  <Divider />
                  {isEditingProfile ? (
                    <Stack spacing={1.5}>
                      <TextField
                        label="Nome"
                        size="small"
                        value={profileForm.firstName}
                        onChange={(event) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            firstName: event.target.value,
                          }))
                        }
                      />
                      <TextField
                        label="Cognome"
                        size="small"
                        value={profileForm.lastName}
                        onChange={(event) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            lastName: event.target.value,
                          }))
                        }
                      />
                      <TextField
                        label="Email"
                        type="email"
                        size="small"
                        value={profileForm.email}
                        onChange={(event) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            email: event.target.value,
                          }))
                        }
                      />
                      {profileError ? (
                        <Alert severity="error" variant="outlined">
                          {profileError}
                        </Alert>
                      ) : null}
                      {profileSuccess ? (
                        <Alert severity="success" variant="outlined">
                          Profilo aggiornato correttamente.
                        </Alert>
                      ) : null}
                      <Typography variant="caption" color="text.secondary">
                        Le modifiche saranno applicate al prossimo login oppure aggiornando manualmente il token.
                      </Typography>
                    </Stack>
                  ) : (
                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="overline" color="text.secondary" letterSpacing={1}>
                          NOME
                        </Typography>
                        <Typography variant="body1">
                          {profileForm.firstName || 'Non impostato'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="overline" color="text.secondary" letterSpacing={1}>
                          COGNOME
                        </Typography>
                        <Typography variant="body1">
                          {profileForm.lastName || 'Non impostato'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="overline" color="text.secondary" letterSpacing={1}>
                          EMAIL
                        </Typography>
                        <Typography variant="body1">
                          {profileForm.email || 'Non disponibile'}
                        </Typography>
                      </Box>
                    </Stack>
                  )}
                </CardContent>
                <CardActions
                  sx={{
                    justifyContent: 'space-between',
                    px: 3,
                    pb: 3,
                    flexWrap: 'wrap',
                    rowGap: 1,
                    gap: 1,
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems="flex-start"
                    sx={{ width: '100%' }}
                  >
                    {isEditingProfile ? (
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: '100%' }}>
                        <Button
                          variant="contained"
                          startIcon={<FaEdit />}
                          onClick={handleProfileSubmit}
                          fullWidth
                          disabled={profileUpdateMutation.isPending}
                        >
                          {profileUpdateMutation.isPending ? 'Salvataggio...' : 'Salva profilo'}
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={handleProfileCancel}
                          fullWidth
                          disabled={profileUpdateMutation.isPending}
                        >
                          Annulla
                        </Button>
                      </Stack>
                    ) : (
                      <Button
                        variant="outlined"
                        startIcon={<FaEdit />}
                        onClick={handleProfileEditToggle}
                        fullWidth
                        sx={{ maxWidth: { xs: '100%', sm: 'auto' } }}
                      >
                        Modifica profilo
                      </Button>
                    )}
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<FaTrashAlt />}
                      onClick={handleOpenDeleteDialog}
                      fullWidth
                      sx={{ maxWidth: { xs: '100%', sm: 'auto' } }}
                    >
                      Elimina profilo
                    </Button>
                  </Stack>
                </CardActions>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
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
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack spacing={0}>
                      <Typography variant="overline" color="text.secondary">
                        Strong Customer Authentication
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        Verifica tramite OTP
                      </Typography>
                    </Stack>
                    {otpSessionExpiresAt ? (
                      <Chip
                        size="small"
                        color="success"
                        icon={<FaCheckCircle />}
                        label="Verificato"
                        sx={{ fontWeight: 600 }}
                      />
                    ) : null}
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    Il codice OTP verrà richiesto al primo accesso e prima di operazioni sensibili come i prelievi. Se non
                    hai ancora completato la verifica, procedi ora.
                  </Typography>
                  {otpSessionExpiresAt ? (
                    <Typography variant="caption" color="text.secondary">
                      Sessione MFA valida fino al {new Date(otpSessionExpiresAt).toLocaleString('it-IT')}.
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="error.main">
                      Nessuna verifica attiva. Completa la procedura per sbloccare tutte le funzionalità.
                    </Typography>
                  )}

                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" onClick={() => setOtpDialogOpen(true)}>
                      Apri verifica OTP
                    </Button>
                  </Stack>
                </CardContent>
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
                    disabled={passwordMutation.isPending}
                  >
                    {passwordMutation.isPending ? 'Sto aggiornando...' : 'Aggiorna password'}
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
                          sx={(theme) => ({
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 2,
                            p: 1.5,
                            bgcolor: theme.palette.action.hover,
                          })}
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

      <Dialog open={isDeleteDialogOpen} onClose={handleCloseDeleteDialog} aria-labelledby="profile-delete-dialog-title">
        <DialogTitle id="profile-delete-dialog-title">Elimina profilo</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <DialogContentText>
            Inserisci la password attuale per confermare l'eliminazione del profilo. L'operazione è irreversibile.
          </DialogContentText>
          <TextField
            label="Password"
            type="password"
            size="small"
            value={deletePassword}
            onChange={(event) => setDeletePassword(event.target.value)}
            autoFocus
          />
          {deleteError ? (
            <Alert severity="error" variant="outlined">
              {deleteError}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={profileDeleteMutation.isPending}>
            Annulla
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDelete}
            disabled={profileDeleteMutation.isPending || deletePassword.length === 0}
          >
            {profileDeleteMutation.isPending ? 'Eliminazione...' : 'Elimina'}
          </Button>
        </DialogActions>
      </Dialog>

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
      <OtpVerificationDialog
        open={otpDialogOpen}
        onClose={handleOtpDialogClose}
        onVerified={handleOtpVerified}
      />
    </Box>
  )
}
