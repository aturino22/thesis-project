import { useMemo, useState, type MouseEventHandler } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import Grid from '@mui/material/GridLegacy'
import { alpha, useTheme } from '@mui/material/styles'
import type { IconType } from 'react-icons'
import { FaArrowCircleDown, FaArrowCircleUp, FaExchangeAlt, FaRocket, FaShieldAlt } from 'react-icons/fa'
import { useAuth } from 'react-oidc-context'
import { appConfig } from '@/config/appConfig'
import {
  useAccountSummary,
  useAccountsQuery,
  useAccountTopUpMutation,
  useAccountTopupsQuery,
  useWithdrawalMethodsQuery,
  useWithdrawalMutation,
  useWithdrawalsQuery,
  useTransactionsQuery,
  useCryptoPositionsQuery,
  type Transaction,
} from '@/api/hooks'
import { OtpVerificationDialog } from '@/components/OtpVerificationDialog'
import { isMfaSessionStillValid, storeMfaSessionExpiry } from '@/utils/mfaSession'
import { PublicHomePage } from '@/pages/PublicHomePage'

type BalanceHistoryPoint = {
  label: string
  value: number
}

type ChartPoint = BalanceHistoryPoint & {
  x: number
  y: number
}

type ActivityKind = 'buy' | 'sell' | 'topup' | 'withdrawal'

type ActivityEntry = {
  id: string
  kind: ActivityKind
  amount: number
  currency: string
  timestamp: string
  label: string
  description?: string | null
  status?: string | null
}

const formatHistoryLabel = (date: Date) =>
  date.toLocaleDateString('it-IT', {
    month: 'short',
    day: 'numeric',
  })

const createFallbackHistory = (totalBalance: number): BalanceHistoryPoint[] => {
  const base = totalBalance > 0 ? totalBalance : 15000
  return Array.from({ length: 6 }).map((_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (5 - index))
    const modifier = 0.92 + index * 0.025
    return {
      label: formatHistoryLabel(date),
      value: Number((base * modifier).toFixed(2)),
    }
  })
}

const buildBalanceHistory = (transactions: Transaction[], totalBalance: number): BalanceHistoryPoint[] => {
  if (!transactions.length) {
    return createFallbackHistory(totalBalance)
  }

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  let cumulative = 0
  const deltas = sortedTransactions.map((transaction) => {
    const sign = transaction.direction === 'sell' ? -1 : 1
    cumulative += sign * transaction.amount
    return {
      date: new Date(transaction.createdAt),
      delta: cumulative,
    }
  })

  const baseValue = totalBalance - cumulative
  return deltas.map((entry) => ({
    label: formatHistoryLabel(entry.date),
    value: Math.max(Number((baseValue + entry.delta).toFixed(2)), 0),
  }))
}

const normalizeChartPoints = (history: BalanceHistoryPoint[]): ChartPoint[] => {
  if (history.length === 0) {
    return []
  }
  const values = history.map((point) => point.value)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1

  return history.map((point, index) => {
    const x = history.length === 1 ? 0 : (index / (history.length - 1)) * 100
    const normalized = (point.value - min) / range
    const y = 100 - normalized * 100
    return { ...point, x, y }
  })
}

const isAuthenticating = (activeNavigator: string | undefined) =>
  activeNavigator === 'signinRedirect' ||
  activeNavigator === 'signoutRedirect' ||
  activeNavigator === 'signinPopup'

const formatCurrency = (amount: number, currency: string | undefined) => {
  if (!currency) {
    return amount.toFixed(2)
  }
  try {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

const formatDateTime = (isoString: string) =>
  new Date(isoString).toLocaleString('it-IT', {
    dateStyle: 'short',
    timeStyle: 'short',
  })

export function HomePage() {
  const theme = useTheme()
  const auth = useAuth()
  const loading =
    auth.isLoading ||
    auth.activeNavigator === 'signinSilent' ||
    auth.activeNavigator === 'signoutSilent'
  const authenticating = isAuthenticating(auth.activeNavigator)

  const isAuthenticated = Boolean(auth.isAuthenticated)

  const accountsQuery = useAccountsQuery({ enabled: isAuthenticated })
  const transactionsQuery = useTransactionsQuery({ enabled: isAuthenticated })
  const cryptoPositionsQuery = useCryptoPositionsQuery({ enabled: isAuthenticated })
  const accountTopupsQuery = useAccountTopupsQuery({ enabled: isAuthenticated })
  const withdrawalsQuery = useWithdrawalsQuery({ enabled: isAuthenticated })

  const accounts = accountsQuery.data ?? []
  const transactions = transactionsQuery.data ?? []
  const topups = accountTopupsQuery.data ?? []
  const withdrawals = withdrawalsQuery.data ?? []
  const accountSummary = useAccountSummary(accounts)
  const cryptoPositions = cryptoPositionsQuery.data?.positions ?? []
  const cryptoTotalValue = cryptoPositionsQuery.data?.totalValue ?? 0
  const marketBasePath = appConfig.routes.market.endsWith('/')
    ? appConfig.routes.market.slice(0, -1)
    : appConfig.routes.market
  const topupMutation = useAccountTopUpMutation()
  const withdrawalMethodsQuery = useWithdrawalMethodsQuery({ enabled: isAuthenticated })
  const withdrawalMutation = useWithdrawalMutation()
  const [topupDialogOpen, setTopupDialogOpen] = useState(false)
  const [topupAccountId, setTopupAccountId] = useState('')
  const [topupAmount, setTopupAmount] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [topupError, setTopupError] = useState<string | null>(null)
  const [topupFeedback, setTopupFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false)
  const [withdrawAccountId, setWithdrawAccountId] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawMethodId, setWithdrawMethodId] = useState('')
  const [withdrawError, setWithdrawError] = useState<string | null>(null)
  const [withdrawFeedback, setWithdrawFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [otpDialogOpen, setOtpDialogOpen] = useState(false)
  const [pendingWithdrawAccountId, setPendingWithdrawAccountId] = useState<string | null>(null)
  const withdrawalMethods = withdrawalMethodsQuery.data ?? []
  const resolvedTopupAccount = useMemo(() => {
    if (!accounts.length) {
      return null
    }
    return accounts.find((account) => account.id === topupAccountId) ?? accounts[0]
  }, [accounts, topupAccountId])
  const defaultWithdrawalMethod = useMemo(
    () => withdrawalMethods.find((method) => method.isDefault) ?? withdrawalMethods[0] ?? null,
    [withdrawalMethods],
  )
  const resolvedWithdrawAccount = useMemo(() => {
    if (!accounts.length) {
      return null
    }
    return accounts.find((account) => account.id === withdrawAccountId) ?? accounts[0]
  }, [accounts, withdrawAccountId])
  const resolvedWithdrawMethod = useMemo(() => {
    if (!withdrawalMethods.length) {
      return null
    }
    return withdrawalMethods.find((method) => method.id === withdrawMethodId) ?? defaultWithdrawalMethod
  }, [withdrawalMethods, withdrawMethodId, defaultWithdrawalMethod])

  const recentActivities = useMemo<ActivityEntry[]>(() => {
    const tradeActivities: ActivityEntry[] = transactions.map((transaction) => ({
      id: `txn-${transaction.id}`,
      kind: transaction.direction,
      amount: transaction.amount,
      currency: transaction.currency,
      timestamp: transaction.createdAt,
      label: transaction.direction === 'buy' ? 'Acquisto asset' : 'Vendita asset',
      description: transaction.category ?? 'Nessuna categoria',
    }))
    const topupActivities: ActivityEntry[] = topups.map((topup) => ({
      id: `topup-${topup.id}`,
      kind: 'topup',
      amount: topup.amount,
      currency: topup.currency,
      timestamp: topup.createdAt,
      label: 'Ricarica conto',
      description: 'Saldo incrementato manualmente',
    }))
    const withdrawalActivities: ActivityEntry[] = withdrawals.map((withdrawal) => ({
      id: `withdrawal-${withdrawal.id}`,
      kind: 'withdrawal',
      amount: withdrawal.totalDebit,
      currency: withdrawal.currency,
      timestamp: withdrawal.requestedAt,
      label: 'Richiesta prelievo',
      description: withdrawal.reference ? `Rif. ${withdrawal.reference}` : null,
      status: withdrawal.status,
    }))
    return [...tradeActivities, ...topupActivities, ...withdrawalActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
  }, [transactions, topups, withdrawals])

  const activityLoading =
    transactionsQuery.isLoading || accountTopupsQuery.isLoading || withdrawalsQuery.isLoading
  const activityError = transactionsQuery.isError || accountTopupsQuery.isError || withdrawalsQuery.isError
  const activityErrorMessage =
    transactionsQuery.error?.message ??
    accountTopupsQuery.error?.message ??
    withdrawalsQuery.error?.message ??
    'Impossibile recuperare i movimenti.'

  const getActivityVisuals = (kind: ActivityKind): { icon: IconType; isCredit: boolean; avatarBg: string; avatarColor: string } => {
    switch (kind) {
      case 'topup':
        return {
          icon: FaArrowCircleDown,
          isCredit: true,
          avatarBg: alpha(theme.palette.success.main, 0.12),
          avatarColor: theme.palette.success.light,
        }
      case 'withdrawal':
        return {
          icon: FaArrowCircleUp,
          isCredit: false,
          avatarBg: alpha(theme.palette.error.main, 0.1),
          avatarColor: theme.palette.error.light,
        }
      case 'sell':
        return {
          icon: FaExchangeAlt,
          isCredit: true,
          avatarBg: alpha(theme.palette.info.main, 0.12),
          avatarColor: theme.palette.info.light,
        }
      case 'buy':
      default:
        return {
          icon: FaExchangeAlt,
          isCredit: false,
          avatarBg: alpha(theme.palette.warning.main, 0.12),
          avatarColor: theme.palette.warning.light,
        }
    }
  }

  const handleOpenTopupDialog = (accountId: string) => {
    setTopupAccountId(accountId)
    setTopupAmount('')
    setCardNumber('')
    setCardExpiry('')
    setCardCvv('')
    setTopupError(null)
    setTopupDialogOpen(true)
  }

  const handleCloseTopupDialog = () => {
    if (topupMutation.isPending) {
      return
    }
    setTopupDialogOpen(false)
    setTopupError(null)
  }

  const handleConfirmTopup = async () => {
    if (!resolvedTopupAccount) {
      setTopupError('Nessun conto selezionato.')
      return
    }
    const numericAmount = Number(topupAmount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setTopupError('Inserisci un importo valido maggiore di zero.')
      return
    }
    const normalizedCard = cardNumber.replace(/\s+/g, '')
    if (!/^\d{16}$/.test(normalizedCard)) {
      setTopupError('Inserisci un numero carta valido di 16 cifre.')
      return
    }
    if (!/^\d{2}\/\d{4}$/.test(cardExpiry)) {
      setTopupError('Inserisci la scadenza nel formato MM/YYYY.')
      return
    }
    const [expMonth] = cardExpiry.split('/')
    const monthNumber = Number(expMonth)
    if (monthNumber < 1 || monthNumber > 12) {
      setTopupError('Il mese di scadenza deve essere compreso tra 01 e 12.')
      return
    }
    if (!/^\d{3}$/.test(cardCvv)) {
      setTopupError('Il CVV deve contenere 3 cifre.')
      return
    }
    setTopupError(null)
    try {
      await topupMutation.mutateAsync({
        accountId: resolvedTopupAccount.id,
        amount: numericAmount,
      })
      setTopupDialogOpen(false)
      setTopupAmount('')
      setCardNumber('')
      setCardExpiry('')
      setCardCvv('')
      setTopupFeedback({
        type: 'success',
        message: `Saldo del conto "${resolvedTopupAccount.name}" incrementato di ${formatCurrency(
          numericAmount,
          resolvedTopupAccount.currency,
        )}.`,
      })
    } catch (error) {
      setTopupError(error instanceof Error ? error.message : 'Operazione non riuscita.')
      setTopupFeedback({
        type: 'error',
        message: 'Impossibile completare la ricarica. Riprova più tardi.',
      })
    }
  }

  const openWithdrawDialogForAccount = (accountId: string) => {
    setWithdrawAccountId(accountId)
    setWithdrawAmount('')
    setWithdrawMethodId(defaultWithdrawalMethod?.id ?? withdrawalMethods[0]?.id ?? '')
    setWithdrawError(null)
    setWithdrawDialogOpen(true)
  }

  const handleOpenWithdrawDialog = (accountId: string) => {
    if (!isMfaSessionStillValid()) {
      setPendingWithdrawAccountId(accountId)
      setOtpDialogOpen(true)
      return
    }
    openWithdrawDialogForAccount(accountId)
  }

  const handleCloseWithdrawDialog = () => {
    if (withdrawalMutation.isPending) {
      return
    }
    setWithdrawDialogOpen(false)
    setWithdrawError(null)
  }

  const handleOtpVerified = (expiresAt: string) => {
    storeMfaSessionExpiry(expiresAt)
    setOtpDialogOpen(false)
    if (pendingWithdrawAccountId) {
      openWithdrawDialogForAccount(pendingWithdrawAccountId)
      setPendingWithdrawAccountId(null)
    }
  }

  const handleCloseOtpDialog = () => {
    setOtpDialogOpen(false)
    setPendingWithdrawAccountId(null)
  }

  const handleConfirmWithdraw = async () => {
    if (!resolvedWithdrawAccount) {
      setWithdrawError('Nessun conto disponibile.')
      return
    }
    if (!resolvedWithdrawMethod) {
      setWithdrawError('Registra prima un metodo di prelievo nella pagina Profilo.')
      return
    }
    const numericAmount = Number(withdrawAmount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setWithdrawError('Inserisci un importo valido maggiore di zero.')
      return
    }
    setWithdrawError(null)
    try {
      await withdrawalMutation.mutateAsync({
        accountId: resolvedWithdrawAccount.id,
        methodId: resolvedWithdrawMethod.id,
        amount: numericAmount,
        currency: resolvedWithdrawAccount.currency,
      })
      setWithdrawDialogOpen(false)
      setWithdrawAmount('')
      setWithdrawFeedback({
        type: 'success',
        message: `Richiesta di prelievo inoltrata da ${formatCurrency(
          numericAmount,
          resolvedWithdrawAccount.currency,
        )}.`,
      })
    } catch (error) {
      setWithdrawError(error instanceof Error ? error.message : 'Operazione non riuscita.')
      setWithdrawFeedback({
        type: 'error',
        message: 'Impossibile completare la richiesta di prelievo. Riprova più tardi.',
      })
    }
  }

  const balanceHistory = useMemo(
    () => buildBalanceHistory(transactions, accountSummary.totalBalance),
    [transactions, accountSummary.totalBalance],
  )
  const chartPoints = useMemo(() => normalizeChartPoints(balanceHistory), [balanceHistory])
  const balanceDelta =
    balanceHistory.length > 1
      ? balanceHistory[balanceHistory.length - 1].value - balanceHistory[0].value
      : 0
  const chartPath = chartPoints.map((point) => `${point.x},${point.y}`).join(' ')
  const areaPath = chartPath ? `${chartPath} 100,100 0,100` : ''
  const balanceDeltaPercent =
    balanceHistory.length > 1 && balanceHistory[0].value !== 0
      ? (balanceDelta / balanceHistory[0].value) * 100
      : 0
  const balanceDeltaLabel = formatCurrency(Math.abs(balanceDelta), accountSummary.currency)
  const balanceDeltaPercentLabel = `${balanceDeltaPercent >= 0 ? '+' : '-'}${Math.abs(balanceDeltaPercent).toFixed(2)}%`

  const handleLogin: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault()
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}${window.location.hash}`
        : appConfig.routes.home
    void auth.signinRedirect({ state: { redirectTo } }).catch((error) => {
      console.error('OIDC login error', error)
    })
  }

  if (!isAuthenticated) {
    return (
      <PublicHomePage
        loading={loading}
        authenticating={authenticating}
        onLogin={handleLogin}
        showMockedAuthChip={appConfig.featureFlags.enableMockedAuth}
        errorMessage={auth.error?.message}
      />
    )
  }

  return (
    <Box
      component="main"
      sx={{
        bgcolor: 'background.default',
        minHeight: '100vh',
        py: { xs: 6, md: 10 },
      }}
    >
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
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    backgroundColor: 'rgba(30, 215, 96, 0.12)',
                  }}
                />
                {loading && (
                  <Chip
                    icon={<CircularProgress size={16} />}
                    label="Sincronizzazione sessione..."
                    color="secondary"
                    variant="outlined"
                    sx={{ fontWeight: 500 }}
                  />
                )}
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
                <Typography variant="h3" component="h1">
                  {appConfig.appName}
                </Typography>
              </Stack>
              <Typography
                variant="body1"
                sx={{
                  maxWidth: { xs: '100%', md: '65ch' },
                  color: 'text.secondary',
                }}
              >
                Piattaforma di digital banking che ti permette di{' '}
                <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
                  muovere capitali, investire e pagare
                </Box>{' '}
                con una sola app: controlli biometrici, alert istantanei e gestione multi-valuta
                pensata per utenti premium e team finance distributed.
              </Typography>
            </Stack>

            {appConfig.featureFlags.enableMockedAuth ? (
              <Chip
                label="Mocked auth attiva"
                color="warning"
                variant="outlined"
                size="small"
                icon={<FaShieldAlt size={14} />}
                sx={{ fontWeight: 600 }}
              />
            ) : null}
          </Stack>

          {auth.error ? (
            <Alert severity="error" variant="outlined">
              {auth.error.message ?? 'Errore durante la negoziazione OpenID Connect.'}
            </Alert>
          ) : null}

          <Stack spacing={3}>
            <Grid container rowSpacing={3} columnSpacing={{ xs: 0, md: 3 }}>
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    height: '100%',
                    borderRadius: 3,
                    border: '1px solid rgba(0, 200, 83, 0.25)',
                    color: 'text.primary',
                    backgroundColor: 'background.paper',
                  }}
                >
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack spacing={0.25}>
                        <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: 1 }}>
                          Crypto portfolio
                        </Typography>
                        <Typography variant="h5" component="h3">
                          Asset digitali
                        </Typography>
                      </Stack>
                      <Chip
                        label={`${cryptoPositions.length} asset`}
                        color="success"
                        variant="outlined"
                        size="small"
                        sx={{ fontWeight: 600, borderColor: 'rgba(30, 215, 96, 0.4)', color: 'primary.main' }}
                      />
                    </Stack>
                    <Typography variant="h4" fontWeight={700}>
                      {cryptoPositionsQuery.isLoading ? '...' : formatCurrency(cryptoTotalValue, 'EUR')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Portafoglio custodial con le principali crypto detenute dal profilo attuale.
                    </Typography>
                    <Divider sx={{ borderColor: 'rgba(0, 200, 83, 0.2)' }} />
                    {cryptoPositionsQuery.isLoading ? (
                      <Stack spacing={1.25}>
                        {Array.from({ length: 3 }).map((_, index) => (
                          <Skeleton key={`crypto-skel-${index}`} variant="rounded" height={48} />
                        ))}
                      </Stack>
                    ) : cryptoPositionsQuery.isError ? (
                      <Alert severity="error" variant="outlined">
                        {cryptoPositionsQuery.error?.message ?? 'Impossibile caricare le posizioni crypto.'}
                      </Alert>
                    ) : cryptoPositions.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Nessuna posizione crypto registrata per questo utente.
                      </Typography>
                    ) : (
                      <List disablePadding>
                        {cryptoPositions.map((asset, index) => {
                          const share = cryptoTotalValue > 0 ? (asset.eurValue / cryptoTotalValue) * 100 : 0
                          const assetSlug = (asset.ticker || asset.name || asset.id).toLowerCase()
                          const assetDetailPath = `${marketBasePath}/${encodeURIComponent(assetSlug)}`
                          return (
                            <ListItem
                              key={asset.id}
                              disableGutters
                              sx={{
                                borderBottom:
                                  index === cryptoPositions.length - 1 ? 'none' : '1px solid',
                                borderColor: index === cryptoPositions.length - 1 ? undefined : 'divider',
                                px: 0,
                              }}
                            >
                              <ListItemButton
                                component={RouterLink}
                                to={assetDetailPath}
                                sx={{
                                  py: 1.25,
                                  px: 0,
                                  borderRadius: 2,
                                  alignItems: 'flex-start',
                                  transition: 'background-color 0.2s ease',
                                  '&:hover': {
                                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                                  },
                                }}
                              >
                                <Stack spacing={1} sx={{ width: '100%' }}>
                                  <Stack
                                    direction="row"
                                    spacing={1.5}
                                    alignItems="center"
                                    justifyContent="space-between"
                                  >
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                      <Avatar
                                        src={asset.iconUrl ?? undefined}
                                        alt={asset.name}
                                        variant="rounded"
                                        sx={{ width: 40, height: 40, bgcolor: 'background.default' }}
                                      >
                                        {!asset.iconUrl ? asset.ticker[0] ?? asset.name[0] ?? '?' : null}
                                      </Avatar>
                                      <Stack spacing={0}>
                                        <Typography variant="subtitle2" fontWeight={600}>
                                          {asset.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {asset.amount.toLocaleString('it-IT', { maximumFractionDigits: 6 })}{' '}
                                          {asset.ticker}
                                        </Typography>
                                      </Stack>
                                    </Stack>
                                    <Stack spacing={0.25} alignItems="flex-end">
                                      <Typography variant="subtitle1" fontWeight={600}>
                                        {formatCurrency(asset.eurValue, 'EUR')}
                                      </Typography>
                                      {asset.change24hPercent != null ? (
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            color: asset.change24hPercent >= 0 ? 'primary.main' : 'error.main',
                                            fontWeight: 600,
                                          }}
                                        >
                                          {asset.change24hPercent >= 0 ? '+' : ''}
                                          {asset.change24hPercent.toFixed(2)}%
                                        </Typography>
                                      ) : (
                                        <Typography variant="caption" color="text.secondary">
                                          n/d
                                        </Typography>
                                      )}
                                    </Stack>
                                  </Stack>
                                  <Box
                                    sx={{
                                      height: 4,
                                      borderRadius: 999,
                                      backgroundColor: alpha(theme.palette.text.primary, 0.08),
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        width: `${share}%`,
                                        background: `linear-gradient(90deg, ${theme.palette.warning.main}, ${theme.palette.primary.main})`,
                                        height: '100%',
                                      }}
                                    />
                                  </Box>
                                </Stack>
                              </ListItemButton>
                            </ListItem>
                          )
                        })}
                      </List>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    height: '100%',
                    borderRadius: 3,
                    border: '1px solid rgba(241, 196, 15, 0.25)',
                    color: 'text.primary',
                    backgroundColor: 'background.paper',
                  }}
                >
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack spacing={0.25}>
                        <Typography variant="overline" color="text.secondary">
                          Andamento saldo
                        </Typography>
                        <Typography variant="h5" component="h3">
                          Saldo totale conti
                        </Typography>
                      </Stack>
                      <Chip
                        label={`${balanceDelta >= 0 ? '+' : '-'}${balanceDeltaLabel} (${balanceDeltaPercentLabel})`}
                        color={balanceDelta >= 0 ? 'success' : 'error'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </Stack>
                    <Typography variant="h4" fontWeight={700}>
                      {accountsQuery.isLoading
                        ? '...'
                        : formatCurrency(accountSummary.totalBalance, accountSummary.currency)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Valore aggregato di tutti i conti collegati al profilo.
                    </Typography>
                    <Box sx={{ position: 'relative', height: 260, mt: 1 }}>
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">
                        <defs>
                          <linearGradient id="balanceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(0, 200, 83, 0.35)" />
                            <stop offset="100%" stopColor="rgba(4, 7, 5, 0)" />
                          </linearGradient>
                        </defs>
                        <rect width="100%" height="100%" fill="rgba(255,255,255,0.02)" rx="4" />
                        {areaPath && <polygon points={areaPath} fill="url(#balanceGradient)" stroke="none" />}
                        {chartPath && (
                          <polyline
                            points={chartPath}
                            fill="none"
                            stroke="#1ED760"
                            strokeWidth="2"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        )}
                        {chartPoints.map((point) => (
                          <circle
                            key={`${point.label}-${point.x.toFixed(2)}`}
                            cx={point.x}
                            cy={point.y}
                            r={1.5}
                            fill="#F1C40F"
                          />
                        ))}
                      </svg>
                    </Box>
                    <Stack direction="row" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
                      {balanceHistory.map((point) => (
                        <Stack key={point.label} spacing={0} alignItems="flex-start">
                          <Typography variant="caption" color="text.secondary">
                            {point.label}
                          </Typography>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {formatCurrency(point.value, accountSummary.currency)}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container rowSpacing={3} columnSpacing={{ xs: 0, md: 3 }}>
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    borderRadius: 3,
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'text.primary',
                    backgroundColor: 'background.paper',
                  }}
                >
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack spacing={0.25}>
                        <Typography variant="overline" color="text.secondary">
                          Conti correnti
                        </Typography>
                        <Typography variant="h5" component="h2">
                          Portafoglio complessivo
                        </Typography>
                      </Stack>
                      <Chip
                        label={`${accounts.length} conti`}
                        color="primary"
                        variant="outlined"
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </Stack>
                    <Typography variant="h4" fontWeight={600}>
                      {accountsQuery.isLoading
                        ? '...'
                        : formatCurrency(accountSummary.totalBalance, accountSummary.currency)}
                    </Typography>
                    <Divider />
                    {topupFeedback ? (
                      <Alert
                        severity={topupFeedback.type}
                        variant="outlined"
                        onClose={() => setTopupFeedback(null)}
                        sx={{ borderRadius: 2 }}
                      >
                        {topupFeedback.message}
                      </Alert>
                    ) : null}
                    {withdrawFeedback ? (
                      <Alert
                        severity={withdrawFeedback.type}
                        variant="outlined"
                        onClose={() => setWithdrawFeedback(null)}
                        sx={{ borderRadius: 2 }}
                      >
                        {withdrawFeedback.message}
                      </Alert>
                    ) : null}
                    {accountsQuery.isLoading ? (
                      <Stack spacing={1.25}>
                        {Array.from({ length: 3 }).map((_, index) => (
                          <Skeleton key={`account-skel-${index}`} variant="rounded" height={32} />
                        ))}
                      </Stack>
                    ) : accountsQuery.isError ? (
                      <Alert severity="error" variant="outlined">
                        {accountsQuery.error.message}
                      </Alert>
                    ) : accounts.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Nessun conto disponibile per l'utente corrente.
                      </Typography>
                    ) : (
                      <List disablePadding>
                        {accounts.map((account, index) => (
                          <ListItem
                            key={account.id}
                            disableGutters
                            sx={{
                              py: 1,
                              borderBottom: index === accounts.length - 1 ? 'none' : '1px solid',
                              borderColor: 'divider',
                            }}
                          >
                            <Stack
                              direction={{ xs: 'column', sm: 'row' }}
                              spacing={1}
                              alignItems={{ xs: 'flex-start', sm: 'center' }}
                              justifyContent="space-between"
                              sx={{ width: '100%' }}
                            >
                              <ListItemText
                                primary={
                                  <Typography variant="subtitle1" fontWeight={600}>
                                    {account.name}
                                  </Typography>
                                }
                                secondary={
                                  <Stack spacing={0.5}>
                                    <Typography variant="body2" color="text.primary">
                                      {formatCurrency(account.balance, account.currency)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      Creato il {formatDateTime(account.createdAt)}
                                    </Typography>
                                  </Stack>
                                }
                                secondaryTypographyProps={{ component: 'div' }}
                              />
                              <Stack direction="row" spacing={1}>
                                <Button variant="outlined" size="small" onClick={() => handleOpenTopupDialog(account.id)}>
                                  Ricarica
                                </Button>
                                <Button
                                  variant="outlined"
                                  color="secondary"
                                  size="small"
                                  disabled={!withdrawalMethods.length}
                                  onClick={() => handleOpenWithdrawDialog(account.id)}
                                >
                                  Preleva
                                </Button>
                              </Stack>
                            </Stack>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    borderRadius: 3,
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'text.primary',
                    backgroundColor: 'background.paper',
                  }}
                >
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack spacing={0.25}>
                        <Typography variant="overline" color="text.secondary">
                          Transazioni recenti
                        </Typography>
                        <Typography variant="h5" component="h2">
                          Ultimi movimenti
                        </Typography>
                      </Stack>
                      <Chip
                        label={`${recentActivities.length} mostrate`}
                        color="primary"
                        variant="outlined"
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </Stack>

                    <Divider />

                    {activityLoading ? (
                      <Stack spacing={1.25}>
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Skeleton key={`txn-skel-${index}`} variant="rounded" height={32} />
                        ))}
                      </Stack>
                    ) : activityError ? (
                      <Alert severity="error" variant="outlined">
                        {activityErrorMessage}
                      </Alert>
                    ) : recentActivities.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Nessuna operazione registrata per i conti selezionati.
                      </Typography>
                    ) : (
                      <List disablePadding>
                        {recentActivities.map((activity, index) => {
                          const visuals = getActivityVisuals(activity.kind)
                          const IconComponent = visuals.icon
                          return (
                            <ListItem
                              key={activity.id}
                              disableGutters
                              sx={{
                                py: 1,
                                borderBottom: index === recentActivities.length - 1 ? 'none' : '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              <Stack
                                direction="row"
                                spacing={2}
                                alignItems="center"
                                sx={{ width: '100%' }}
                              >
                                <Avatar
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    bgcolor: visuals.avatarBg,
                                    color: visuals.avatarColor,
                                  }}
                                >
                                  <IconComponent size={18} />
                                </Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                  <Typography variant="subtitle2" fontWeight={600}>
                                    {activity.label}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    {formatDateTime(activity.timestamp)}
                                  </Typography>
                                  {activity.kind === 'withdrawal' ? (
                                    <Chip
                                      label={getWithdrawalStatusLabel(activity.status)}
                                      color={getWithdrawalStatusColor(activity.status)}
                                      size="small"
                                      variant="outlined"
                                      sx={{ mt: 0.5, fontWeight: 600 }}
                                    />
                                  ) : activity.description ? (
                                    <Typography variant="body2" color="text.secondary">
                                      {activity.description}
                                    </Typography>
                                  ) : null}
                                </Box>
                                <Typography
                                  variant="subtitle1"
                                  fontWeight={600}
                                  color={visuals.isCredit ? 'success.main' : 'error.main'}
                                >
                                  {visuals.isCredit ? '+' : '-'}
                                  {formatCurrency(activity.amount, activity.currency)}
                                </Typography>
                              </Stack>
                            </ListItem>
                          )
                        })}
                      </List>
                    )}
                 </CardContent>
               </Card>
             </Grid>
            </Grid>
          </Stack>



          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            <Typography variant="body2" color="text.secondary">
              Versione build
            </Typography>
            <Chip
              label={appConfig.version}
              color="secondary"
              variant="filled"
              size="small"
              sx={{ fontFamily: 'var(--mui-fontFamily-code)', fontWeight: 600 }}
            />
            <Chip
              label={isAuthenticated ? 'Sessione attiva' : 'Sessione non attiva'}
              color={isAuthenticated ? 'success' : 'default'}
              variant={isAuthenticated ? 'filled' : 'outlined'}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Stack>

          <Dialog open={topupDialogOpen} onClose={handleCloseTopupDialog} fullWidth maxWidth="sm">
            <DialogTitle>Ricarica saldo</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              {!resolvedTopupAccount ? (
                <Alert severity="warning" variant="outlined">
                  Non esistono conti da ricaricare.
                </Alert>
              ) : (
                <>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={600}>
                      {resolvedTopupAccount.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Saldo attuale: {formatCurrency(resolvedTopupAccount.balance, resolvedTopupAccount.currency)}
                    </Typography>
                  </Box>

                  <TextField
                    label="Numero carta (16 cifre)"
                    size="small"
                    value={cardNumber}
                    onChange={(event) => {
                      const digitsOnly = event.target.value.replace(/\D/g, '')
                      setCardNumber(digitsOnly.slice(0, 16))
                    }}
                    placeholder="0000000000000000"
                    inputProps={{ inputMode: 'numeric', maxLength: 16 }}
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <TextField
                      label="Scadenza (MM/YYYY)"
                      size="small"
                      value={cardExpiry}
                      onChange={(event) => {
                        const raw = event.target.value.replace(/[^\d]/g, '')
                        const sliced = raw.slice(0, 6)
                        const formatted = sliced.length <= 2 ? sliced : `${sliced.slice(0, 2)}/${sliced.slice(2, 6)}`
                        setCardExpiry(formatted)
                      }}
                      placeholder="08/2027"
                      inputProps={{ maxLength: 7 }}
                    />
                    <TextField
                      label="CVV"
                      size="small"
                      value={cardCvv}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, '').slice(0, 3)
                        setCardCvv(digits)
                      }}
                      inputProps={{ maxLength: 3, inputMode: 'numeric' }}
                    />
                  </Stack>
                  <TextField
                    label="Importo"
                    type="number"
                    size="small"
                    value={topupAmount}
                    onChange={(event) => setTopupAmount(event.target.value)}
                    inputProps={{ min: 0, step: '0.01' }}
                  />

                  {topupError ? (
                    <Alert severity="error" variant="outlined">
                      {topupError}
                    </Alert>
                  ) : null}
                  <Alert severity="info" variant="outlined">
                    La ricarica è simulata e non genera alcun addebito reale.
                  </Alert>
                </>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleCloseTopupDialog} disabled={topupMutation.isPending}>
                Annulla
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmTopup}
                disabled={topupMutation.isPending || !resolvedTopupAccount}
              >
                {topupMutation.isPending ? 'In corso...' : 'Ricarica'}
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog open={withdrawDialogOpen} onClose={handleCloseWithdrawDialog} fullWidth maxWidth="sm">
            <DialogTitle>Richiedi prelievo</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              {!resolvedWithdrawAccount ? (
                <Alert severity="warning" variant="outlined">
                  Non sono presenti conti collegati.
                </Alert>
              ) : withdrawalMethods.length === 0 ? (
                <Stack spacing={2}>
                  <Alert severity="warning" variant="outlined">
                    Registra prima un metodo di prelievo dalla pagina Profilo per poter inviare una richiesta.
                  </Alert>
                  <Button
                    component={RouterLink}
                    to={appConfig.routes.profile}
                    variant="outlined"
                    color="secondary"
                  >
                    Vai alla pagina Profilo
                  </Button>
                </Stack>
              ) : (
                <>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={600}>
                      {resolvedWithdrawAccount.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Saldo disponibile: {formatCurrency(resolvedWithdrawAccount.balance, resolvedWithdrawAccount.currency)}
                    </Typography>
                  </Box>
                  <TextField
                    select
                    label="Metodo di prelievo"
                    size="small"
                    value={resolvedWithdrawMethod?.id ?? ''}
                    onChange={(event) => setWithdrawMethodId(event.target.value)}
                  >
                    {withdrawalMethods.map((method) => (
                      <MenuItem key={method.id} value={method.id}>
                        {method.accountHolderName} · IBAN ****{method.iban.slice(-4)}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Importo"
                    type="number"
                    size="small"
                    value={withdrawAmount}
                    onChange={(event) => setWithdrawAmount(event.target.value)}
                    inputProps={{ min: 0, step: '0.01' }}
                  />
                  {withdrawError ? (
                    <Alert severity="error" variant="outlined">
                      {withdrawError}
                    </Alert>
                  ) : null}
                  <Alert severity="info" variant="outlined">
                    Il prelievo viene simulato e lo stato passa a <strong>PENDING</strong> fino al completamento.
                  </Alert>
                </>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleCloseWithdrawDialog} disabled={withdrawalMutation.isPending}>
                Annulla
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleConfirmWithdraw}
                disabled={withdrawalMutation.isPending || !resolvedWithdrawAccount || !withdrawalMethods.length}
              >
                {withdrawalMutation.isPending ? 'Invio...' : 'Conferma'}
              </Button>
            </DialogActions>
          </Dialog>
        </Stack>
      </Container>
      <OtpVerificationDialog
        open={otpDialogOpen}
        onClose={handleCloseOtpDialog}
        onVerified={handleOtpVerified}
      />
    </Box>
  )
}

const withdrawalStatusLabelMap: Record<string, string> = {
  PENDING: 'In attesa',
  COMPLETED: 'Completato',
  FAILED: 'Fallito',
}

const getWithdrawalStatusLabel = (status?: string | null) => {
  if (!status) {
    return 'Sconosciuto'
  }
  return withdrawalStatusLabelMap[status] ?? status
}

const getWithdrawalStatusColor = (status?: string | null): 'warning' | 'success' | 'error' | 'default' => {
  switch (status) {
    case 'COMPLETED':
      return 'success'
    case 'FAILED':
      return 'error'
    case 'PENDING':
      return 'warning'
    default:
      return 'default'
  }
}



