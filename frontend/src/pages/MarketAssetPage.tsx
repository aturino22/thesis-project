import { useMemo, useState, type MouseEventHandler } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { FaArrowLeft, FaCaretDown, FaCaretUp, FaEllipsisH, FaEuroSign } from 'react-icons/fa'
import { useAccountsQuery, useCryptoTradeMutation, useMarketAssetQuery } from '@/api/hooks'

const formatPrice = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)

const formatDateTime = (value: string) => new Date(value).toLocaleString('it-IT')
const formatAxisTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

export function MarketAssetPage() {
  const { ticker: assetIdentifier = '' } = useParams<{ ticker: string }>()
  const assetDetail = useMarketAssetQuery(assetIdentifier, { enabled: Boolean(assetIdentifier) })
  const accountsQuery = useAccountsQuery({ enabled: true })
  const tradeMutation = useCryptoTradeMutation()
  const asset = assetDetail.data?.asset
  const history = useMemo(() => assetDetail.data?.history ?? [], [assetDetail.data?.history])
  const position = assetDetail.data?.position ?? null
  const transactions = assetDetail.data?.transactions ?? []
  const accounts = accountsQuery.data ?? []

  const [tradeDialogOpen, setTradeDialogOpen] = useState(false)
  const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [quantity, setQuantity] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const chartData = useMemo(() => {
    if (!history.length) {
      return { polyline: '', polygon: '', xTicks: [], yTicks: [] }
    }

    const ordered = [...history].sort((a, b) => a.timestamp - b.timestamp)
    const firstPoint = ordered[0]
    const lastPoint = ordered[ordered.length - 1]
    const prices = ordered.map((point) => point.price)
    const maxPrice = Math.max(...prices)
    const minPrice = Math.min(...prices)
    const baseline = firstPoint.price
    const timeStart = firstPoint.timestamp
    const timeEnd = lastPoint.timestamp
    const timeRange = Math.max(timeEnd - timeStart, 1)
    const maxSwing = Math.max(
      Math.abs(maxPrice - baseline),
      Math.abs(minPrice - baseline),
      Math.max(baseline * 0.01, 1),
    )

    const toX = (timestamp: number) => 5 + ((timestamp - timeStart) / timeRange) * 90

    const coordinates = ordered.map((point) => {
      const diff = point.price - baseline
      const normalized = Math.max(-1, Math.min(1, diff / maxSwing))
      const y = 50 - normalized * 35
      return {
        x: Number(Math.max(5, Math.min(95, toX(point.timestamp))).toFixed(2)),
        y: Number(Math.max(10, Math.min(90, y)).toFixed(2)),
      }
    })

    const polyline = coordinates.map((point) => `${point.x},${point.y}`).join(' ')
    const polygon = [
      `${coordinates[0].x},50`,
      ...coordinates.map((point) => `${point.x},${point.y}`),
      `${coordinates[coordinates.length - 1].x},50`,
    ].join(' ')

    const labelPosition = (timestamp: number) => ({
      position: Number(Math.max(5, Math.min(95, toX(timestamp))).toFixed(2)),
      timestamp,
    })

    return {
      polyline,
      polygon,
      xTicks: [
        labelPosition(timeStart),
        labelPosition(timeStart + timeRange / 2),
        labelPosition(timeEnd),
      ],
      yTicks: [
        { position: 15, value: maxPrice },
        { position: 50, value: baseline },
        { position: 85, value: minPrice },
      ],
    }
  }, [history])

  const handleOpenTradeDialog = (side: 'buy' | 'sell') => {
    setTradeSide(side)
    setQuantity('')
    setFormError(null)
    if (accounts.length > 0) {
      setSelectedAccountId(accounts[0].id)
    }
    setTradeDialogOpen(true)
  }

  const handleCloseTradeDialog = () => {
    setTradeDialogOpen(false)
    setFormError(null)
  }

  const handleConfirmTrade: MouseEventHandler<HTMLButtonElement> = async (event) => {
    event.preventDefault()
    if (!asset) {
      setFormError('Asset non valido.')
      return
    }
    if (!selectedAccountId) {
      setFormError('Seleziona un conto valido.')
      return
    }
    const parsedQuantity = Number(quantity) || 0
    if (!(parsedQuantity > 0)) {
      setFormError('Inserisci una quantita maggiore di zero.')
      return
    }
    const tradeLimit = tradeSide === 'sell' ? maxSellQuantity : maxBuyQuantity
    if (tradeLimit <= 0) {
      setFormError(
        tradeSide === 'sell'
          ? 'Non c e disponibilita da vendere per questo asset.'
          : 'Saldo insufficiente per completare l acquisto.',
      )
      return
    }
    if (parsedQuantity > tradeLimit) {
      const limitLabel = tradeLimit.toLocaleString('it-IT', { maximumFractionDigits: 6 })
      setFormError(
        tradeSide === 'sell'
          ? `Puoi vendere al massimo ${limitLabel} ${asset.symbol}.`
          : `Puoi acquistare al massimo ${limitLabel} ${asset.symbol} con il saldo attuale. Clicca per comprare la massima quantita acquistabile con il tuo saldo corrente.`,
      )
      return
    }
    setFormError(null)
    try {
      await tradeMutation.mutateAsync({
        accountId: selectedAccountId,
        assetSymbol: asset.symbol,
        assetName: asset.name,
        priceEur: asset.price,
        quantity: parsedQuantity,
        side: tradeSide,
      })
      setFeedback({
        type: 'success',
        message: `Operazione di ${tradeSide === 'buy' ? 'acquisto' : 'vendita'} completata.`,
      })
      setTradeDialogOpen(false)
      void assetDetail.refetch()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Operazione non riuscita.')
      setFeedback({
        type: 'error',
        message: "Impossibile completare l'operazione, riprova piu tardi.",
      })
    }
  }

  if (assetDetail.isLoading) {
    return (
      <Box component="section" sx={{ bgcolor: '#000000', py: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          <Stack spacing={3}>
            <Skeleton variant="text" width={200} height={32} sx={{ bgcolor: 'grey.800' }} />
            {Array.from({ length: 3 }).map((_, index) => (
              <Card
                key={`asset-skeleton-${index}`}
                sx={{
                  borderRadius: 3,
                  backgroundColor: 'background.paper',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Skeleton variant="text" width="60%" height={24} sx={{ bgcolor: 'grey.800' }} />
                  <Skeleton
                    variant="rounded"
                    height={index === 1 ? 220 : 140}
                    sx={{ bgcolor: 'grey.900', borderRadius: 2 }}
                  />
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Container>
      </Box>
    )
  }

  if (assetDetail.isError) {
    return (
      <Box component="section" sx={{ bgcolor: '#000000', py: { xs: 4, md: 6 } }}>
        <Container maxWidth="md">
          <Alert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>
            {assetDetail.error?.message ?? 'Impossibile caricare il dettaglio della crypto.'}
            <Box mt={2}>
              <Button component={RouterLink} to="/market" variant="contained" size="small">
                Torna al market
              </Button>
            </Box>
          </Alert>
        </Container>
      </Box>
    )
  }

  if (!asset) {
    return (
      <Box component="section" sx={{ bgcolor: '#000000', py: { xs: 4, md: 6 } }}>
        <Container maxWidth="md">
          <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
            Asset non disponibile. Torna alla pagina{' '}
            <Button component={RouterLink} to="/market" size="small">
              Market
            </Button>
          </Alert>
        </Container>
      </Box>
    )
  }

  const heldQuantity = position ? position.amount : 0
  const formattedHeldQuantity = heldQuantity
    ? heldQuantity.toLocaleString('it-IT', { maximumFractionDigits: 6 })
    : '0'
  const numericQuantity = Number(quantity) || 0
  const tradeTotal = asset.price * numericQuantity
  const dialogDisabled = tradeMutation.isPending || accounts.length === 0
  const dialogTitle = tradeSide === 'buy' ? 'Acquista' : 'Vendi'
  const investmentValue = position ? position.eurValue : 0
  const deltaSign = asset.change24h >= 0 ? '+' : '-'
  const deltaColor = asset.change24h >= 0 ? '#1ED760' : '#FF4D6D'
  const resolvedAccount =
    selectedAccountId && accounts.length > 0 ? accounts.find((account) => account.id === selectedAccountId) : accounts[0]
  const selectedAccountBalance = Number(resolvedAccount?.balance ?? 0)
  const selectedAccountCurrency = resolvedAccount?.currency ?? 'EUR'
  const maxSellQuantity = position ? Number(position.amount) : 0
  const maxBuyQuantity = asset.price > 0 ? selectedAccountBalance / asset.price : 0
  const tradeMaxQuantity = tradeSide === 'sell' ? maxSellQuantity : maxBuyQuantity
  const formattedTradeMaxQuantity =
    tradeMaxQuantity > 0 ? tradeMaxQuantity.toLocaleString('it-IT', { maximumFractionDigits: 6 }) : '0'
  const applyMaxBuyQuantity = () => {
    if (tradeSide === 'buy' && tradeMaxQuantity > 0) {
      setQuantity(tradeMaxQuantity.toFixed(6))
      setFormError(null)
    }
  }
  const isMaxBuyError = formError?.includes('Clicca per comprare la massima quantita acquistabile')

  return (
    <Box component="section" sx={{ bgcolor: '#000000', py: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Button
            variant="text"
            startIcon={<FaArrowLeft />}
            component={RouterLink}
            to="/market"
            sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}
          >
            Torna al market
          </Button>

          <Box
            sx={{
              borderRadius: 3,
              border: '1px solid rgba(241,196,15,0.2)',
              background: 'linear-gradient(135deg, rgba(18,2,18,0.9), rgba(3,3,3,0.9))',
              p: { xs: 3, md: 4 },
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={3}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
            >
              <Stack spacing={1}>
                <Typography variant="overline" color="text.secondary">
                  {asset.symbol}  -  {asset.name}
                </Typography>
                <Typography variant="h3" fontWeight={700}>
                  {formatPrice(asset.price)}
                </Typography>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  {deltaSign === '+' ? (
                    <FaCaretUp color={deltaColor} size={18} />
                  ) : (
                    <FaCaretDown color={deltaColor} size={18} />
                  )}
                  <Typography variant="body1" sx={{ color: deltaColor, fontWeight: 600 }}>
                    {Math.abs(asset.change24h).toFixed(2)}%
                  </Typography>
                  <Chip label="Oggi" size="small" sx={{ bgcolor: '#7C4DFF', color: '#fff' }} />
                </Stack>
                <Typography variant="body2" sx={{ color: '#B0BEC5' }}>
                  Quantita detenuta: {formattedHeldQuantity} {asset.symbol}
                </Typography>
              </Stack>
              <Avatar
                src={asset.image ?? undefined}
                alt={asset.name}
                sx={{
                  width: 72,
                  height: 72,
                  bgcolor: '#0d0d0d',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                {asset.symbol?.slice(0, 3) ?? asset.name?.slice(0, 2) ?? '?'}
              </Avatar>
            </Stack>
            <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.08)' }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems="center">
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  onClick={() => handleOpenTradeDialog('buy')}
                  disabled={accounts.length === 0}
                >
                  Compra
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleOpenTradeDialog('sell')}
                  disabled={accounts.length === 0 || !position || position.amount <= 0}
                >
                  Vendi
                </Button>
                <IconButton
                  size="small"
                  sx={{
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'text.secondary',
                  }}
                >
                  <FaEllipsisH />
                </IconButton>
              </Stack>
              {asset.explorer_url ? (
                <Button
                  component="a"
                  href={asset.explorer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  variant="text"
                  sx={{ color: 'text.secondary' }}
                >
                  Apri explorer
                </Button>
              ) : null}
            </Stack>
          </Box>

          <Card
            sx={{
              borderRadius: 3,
              backgroundColor: '#050505',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="overline" color="text.secondary">
                Andamento ultimi 7 giorni
              </Typography>
              <Box
                sx={{
                  position: 'relative',
                  height: 280,
                  pb: 4,
                  overflow: 'visible',
                }}
              >
                {history.length === 0 ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }} spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      Storico non disponibile in questo momento.
                    </Typography>
                  </Stack>
                ) : (
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">
                    <defs>
                      <linearGradient id="assetGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(255, 82, 82, 0.35)" />
                        <stop offset="100%" stopColor="rgba(5, 5, 5, 0)" />
                      </linearGradient>
                    </defs>
                    <rect width="100%" height="100%" fill="rgba(255,255,255,0.02)" rx="4" />
                    <line x1="5" y1="10" x2="5" y2="90" stroke="rgba(255,255,255,0.15)" strokeWidth={0.6} />
                    <line
                      x1="5"
                      y1="50"
                      x2="95"
                      y2="50"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth={0.6}
                      strokeDasharray="4 2"
                    />
                    {chartData.polyline ? (
                      <>
                        <polygon points={chartData.polygon} fill="url(#assetGradient)" opacity={0.5} />
                        <polyline
                          points={chartData.polyline}
                          fill="none"
                          stroke="rgba(255, 82, 82, 0.9)"
                          strokeWidth={2}
                          strokeLinecap="round"
                        />
                      </>
                    ) : null}
                  </svg>
                )}
                {chartData.polyline
                  ? chartData.yTicks.map((tick, index) => (
                      <Typography
                        key={`history-y-${index}`}
                        variant="caption"
                        sx={{
                          position: 'absolute',
                          left: 0,
                          top: `${tick.position}%`,
                          transform: 'translate(-20%, -50%)',
                          color: 'text.secondary',
                          fontSize: '0.65rem',
                        }}
                      >
                        {formatPrice(tick.value)}
                      </Typography>
                    ))
                  : null}
                {chartData.polyline
                  ? chartData.xTicks.map((tick, index) => (
                      <Typography
                        key={`history-x-${index}`}
                        variant="caption"
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: `${tick.position}%`,
                          transform: 'translate(-50%, 110%)',
                          color: 'text.secondary',
                          fontSize: '0.65rem',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatAxisTimestamp(tick.timestamp)}
                      </Typography>
                    ))
                  : null}
              </Box>
              <Typography variant="body2" color="text.secondary">
                Questo E il punto intermedio tra i tassi di acquisto e vendita. Il tasso effettivo puo variare a seconda
                dell'operazione scelta; i prezzi provengono dal feed CoinCap simulato.
              </Typography>
            </CardContent>
          </Card>

          <Card
            sx={{
              borderRadius: 3,
              backgroundColor: '#050505',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="overline" color="text.secondary">
                Investimento
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {formatPrice(investmentValue)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Valore totale
              </Typography>
              {position ? (
                <Box
                  sx={{
                    mt: 1,
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.08)',
                    bgcolor: '#0b0b0b',
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        src={asset.image ?? undefined}
                        alt={asset.name}
                        sx={{ width: 40, height: 40, bgcolor: '#120212', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        {asset.symbol?.slice(0, 2) ?? '?'}
                      </Avatar>
                      <Stack spacing={0}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          Saldo detenuto
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formattedHeldQuantity} {asset.symbol}
                        </Typography>
                      </Stack>
                    </Stack>
                    <Stack spacing={0} alignItems="flex-end">
                      <Typography variant="subtitle1" fontWeight={600}>
                        {formatPrice(position.eurValue)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: deltaColor }}>
                        {deltaSign}
                        {Math.abs(asset.change24h).toFixed(2)}%
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Non possiedi ancora questa criptovaluta. Inizia con un acquisto per popolare il saldo.
                </Typography>
              )}
            </CardContent>
          </Card>

          <Card
            sx={{
              borderRadius: 3,
              backgroundColor: '#050505',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="overline" color="text.secondary">
                Transazioni recenti
              </Typography>
              {transactions.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nessuna transazione registrata per questo asset.
                </Typography>
              ) : (
                <Stack spacing={1.25}>
                  {transactions.map((transaction) => {
                    const quantityEstimate =
                      asset.price > 0 ? Number(transaction.amount) / asset.price : Number(transaction.amount)
                    const quantityLabel = `${Math.abs(quantityEstimate).toFixed(3)} ${asset.symbol}`
                    const euroLabel = `${formatPrice(transaction.amount)}`
                    const isBuy = transaction.direction === 'buy'
                    const txColor = isBuy ? '#1ED760' : '#FF4D6D'
                    return (
                      <Box
                        key={transaction.id}
                        sx={{
                          borderRadius: 2,
                          border: '1px solid rgba(255,255,255,0.08)',
                          bgcolor: '#0b0b0b',
                          p: 2,
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Stack direction="row" spacing={-1}>
                              <Avatar
                                sx={{
                                  width: 36,
                                  height: 36,
                                  bgcolor: '#120212',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  fontWeight: 700,
                                }}
                              >
                                {asset.symbol?.slice(0, 2) ?? '?'}
                              </Avatar>
                              <Avatar
                                sx={{
                                  width: 36,
                                  height: 36,
                                  bgcolor: '#0f172a',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <FaEuroSign />
                              </Avatar>
                            </Stack>
                            <Stack spacing={0}>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <FaEuroSign />
                                <Typography component="span" variant="subtitle2" fontWeight={600}>
                                  →
                                </Typography>
                                <Typography component="span" variant="subtitle2" fontWeight={600}>
                                  {asset.symbol}
                                </Typography>
                              </Stack>
                              <Typography variant="caption" color="text.secondary">
                                {formatDateTime(transaction.createdAt)}
                              </Typography>
                            </Stack>
                          </Stack>
                          <Stack spacing={0} alignItems="flex-end">
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              {isBuy ? (
                                <FaCaretUp color={txColor} />
                              ) : (
                                <FaCaretDown color={txColor} />
                              )}
                              <Typography variant="subtitle2" sx={{ color: txColor, fontWeight: 600 }}>
                                {quantityLabel}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <FaEuroSign color="rgba(255,255,255,0.7)" />
                              <Typography variant="caption" color="text.secondary">
                                {isBuy ? '-' : '+'}
                                {euroLabel}
                              </Typography>
                            </Stack>
                          </Stack>
                        </Stack>
                      </Box>
                    )
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Container>

      <Dialog open={tradeDialogOpen} onClose={handleCloseTradeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {dialogTitle} {asset.name}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {accounts.length === 0 ? (
            <Alert severity="warning" variant="outlined">
              Nessun conto disponibile. Crea un conto in EUR per poter operare.
            </Alert>
          ) : null}
          <FormControl fullWidth size="small" disabled={accounts.length === 0 || dialogDisabled}>
            <InputLabel id="asset-account-label">Conto</InputLabel>
            <Select
              labelId="asset-account-label"
              label="Conto"
              value={selectedAccountId}
              onChange={(event) => setSelectedAccountId(event.target.value)}
            >
              {accounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            type="number"
            label="Quantita"
            size="small"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            inputProps={{
              min: 0,
              step: '0.0001',
              max: tradeMaxQuantity > 0 ? tradeMaxQuantity : undefined,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {tradeSide === 'sell'
              ? `Disponibile: ${formattedHeldQuantity} ${asset.symbol}.`
              : `Saldo disponibile: ${formatPrice(selectedAccountBalance)} · Max acquistabile: ${formattedTradeMaxQuantity} ${asset.symbol}.`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Prezzo unitario: {formatPrice(asset.price)}
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            Totale: {formatPrice(tradeTotal)}
          </Typography>
          {formError ? (
            <Alert severity="error" variant="outlined">
              {formError}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseTradeDialog} disabled={dialogDisabled}>
            Annulla
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmTrade}
            disabled={dialogDisabled || accounts.length === 0}
            startIcon={tradeMutation.isPending ? <CircularProgress size={16} /> : null}
          >
            Conferma
          </Button>
        </DialogActions>
      </Dialog>

      {feedback ? (
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            minWidth: 280,
          }}
        >
          <Alert
            severity={feedback.type}
            onClose={() => setFeedback(null)}
            variant="filled"
            sx={{ boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}
          >
            {feedback.message}
          </Alert>
        </Box>
      ) : null}
    </Box>
  )
}







