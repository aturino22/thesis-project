import { useMemo, type MouseEventHandler } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import Grid from '@mui/material/GridLegacy'
import { FaRocket, FaShieldAlt } from 'react-icons/fa'
import { alpha, useTheme } from '@mui/material/styles'
import { useAuth } from 'react-oidc-context'
import { appConfig } from '@/config/appConfig'
import {
  useAccountSummary,
  useAccountsQuery,
  useTransactionsQuery,
  useCryptoPositionsQuery,
  type Transaction,
} from '@/api/hooks'
import { PublicHomePage } from '@/pages/PublicHomePage'

type BalanceHistoryPoint = {
  label: string
  value: number
}

type ChartPoint = BalanceHistoryPoint & {
  x: number
  y: number
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

  const accounts = accountsQuery.data ?? []
  const transactions = transactionsQuery.data ?? []
  const recentTransactions = transactions.slice(0, 5)
  const accountSummary = useAccountSummary(accounts)
  const cryptoPositions = cryptoPositionsQuery.data?.positions ?? []
  const cryptoTotalValue = cryptoPositionsQuery.data?.totalValue ?? 0
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

  const displayName =
    auth.user?.profile?.preferred_username ??
    auth.user?.profile?.name ??
    auth.user?.profile?.email

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
            <Grid container spacing={3}>
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
                          return (
                            <ListItem
                              key={asset.id}
                              disableGutters
                              sx={{
                                py: 1.25,
                                borderBottom:
                                  index === cryptoPositions.length - 1 ? 'none' : '1px solid',
                                borderColor: index === cryptoPositions.length - 1 ? undefined : 'divider',
                                alignItems: 'flex-start',
                              }}
                            >
                              <Stack spacing={1} sx={{ width: '100%' }}>
                                <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
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

            <Grid container spacing={3}>
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
                        label={`${recentTransactions.length} mostrate`}
                        color="primary"
                        variant="outlined"
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </Stack>

                    <Divider />

                    {transactionsQuery.isLoading ? (
                      <Stack spacing={1.25}>
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Skeleton key={`txn-skel-${index}`} variant="rounded" height={32} />
                        ))}
                      </Stack>
                    ) : transactionsQuery.isError ? (
                      <Alert severity="error" variant="outlined">
                        {transactionsQuery.error.message}
                      </Alert>
                    ) : recentTransactions.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Nessuna transazione registrata per i conti selezionati.
                      </Typography>
                    ) : (
                      <List disablePadding>
                        {recentTransactions.map((transaction, index) => (
                          <ListItem
                            key={transaction.id}
                            disableGutters
                            sx={{
                              alignItems: 'flex-start',
                              py: 1,
                              borderBottom:
                                index === recentTransactions.length - 1 ? 'none' : '1px solid',
                              borderColor: 'divider',
                            }}
                          >
                            <ListItemText
                              primary={
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  justifyContent="space-between"
                                  alignItems="baseline"
                                >
                                  <Typography
                                    variant="subtitle1"
                                    fontWeight={600}
                                    color={
                                      transaction.direction === 'sell'
                                        ? 'success.main'
                                        : 'error.main'
                                    }
                                  >
                                    {transaction.direction === 'sell' ? '+' : '-'}
                                    {formatCurrency(transaction.amount, transaction.currency)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatDateTime(transaction.createdAt)}
                                  </Typography>
                                </Stack>
                              }
                              secondary={
                                <Typography variant="body2" color="text.secondary">
                                  {transaction.category ?? 'Nessuna categoria'}
                                </Typography>
                              }
                              secondaryTypographyProps={{ component: 'div' }}
                            />
                          </ListItem>
                        ))}
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
        </Stack>
      </Container>
    </Box>
  )
}



