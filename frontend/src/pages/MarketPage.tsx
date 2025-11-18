import { useMemo, useState, type MouseEventHandler } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { alpha, useTheme } from '@mui/material/styles'
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
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import Grid from '@mui/material/GridLegacy'
import {
  useAccountsQuery,
  useCryptoTradeMutation,
  useMarketPricesQuery,
  type MarketAsset,
} from '@/api/hooks'
import { FaCaretDown, FaCaretUp } from 'react-icons/fa'

const formatPrice = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)

export function MarketPage() {
  const theme = useTheme()
  const accountsQuery = useAccountsQuery({ enabled: true })
  const tradeMutation = useCryptoTradeMutation()
  const marketQuery = useMarketPricesQuery({ enabled: true })

  const accounts = accountsQuery.data ?? []
  const assets = marketQuery.data ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [side] = useState<'buy' | 'sell'>('buy')
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [quantity, setQuantity] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const parsedQuantity = Number(quantity) || 0
  const tradeValue = useMemo(
    () => (selectedAsset ? selectedAsset.price * parsedQuantity : 0),
    [parsedQuantity, selectedAsset],
  )

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedAsset(null)
    setFormError(null)
  }

  const handleConfirmTrade: MouseEventHandler<HTMLButtonElement> = async (event) => {
    event.preventDefault()
    if (!selectedAsset) {
      setFormError('Seleziona una cripto da negoziare.')
      return
    }
    if (!selectedAccountId) {
      setFormError('Seleziona un conto da utilizzare.')
      return
    }
    if (!(parsedQuantity > 0)) {
      setFormError('Inserisci una quantita valida maggiore di zero.')
      return
    }
    setFormError(null)
    try {
      await tradeMutation.mutateAsync({
        accountId: selectedAccountId,
        assetSymbol: selectedAsset.symbol,
        assetName: selectedAsset.name,
        priceEur: selectedAsset.price,
        quantity: parsedQuantity,
        side,
      })
      setFeedback({
        type: 'success',
        message: `Ordine di ${side === 'buy' ? 'acquisto' : 'vendita'} completato con successo.`,
      })
      handleCloseDialog()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Operazione non riuscita.')
      setFeedback({
        type: 'error',
        message: "Impossibile completare l'operazione, riprova piu tardi.",
      })
    }
  }

  const dialogDisabled = tradeMutation.isPending || accounts.length === 0

  return (
    <Box component="section" sx={{ bgcolor: 'background.default', py: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card
              sx={{
                borderRadius: 3,
                backgroundColor: 'background.paper',
                border: '1px solid rgba(0, 200, 83, 0.25)',
              }}
            >
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Stack spacing={1}>
                  <Typography variant="overline" color="text.secondary">
                    Navigazione
                  </Typography>
                  <Typography variant="h3" fontWeight={700}>
                    Market
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Negozia crypto usando i tuoi conti in EUR e aggiorna il portafoglio in tempo reale.
                  </Typography>
                </Stack>
                <Divider />
                <Stack spacing={1}>
                  <Chip
                    label={marketQuery.isLoading ? 'Caricamento asset...' : `${assets.length} asset disponibili`}
                    variant="outlined"
                    color="success"
                    sx={{ alignSelf: 'flex-start' }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    I prezzi arrivano in tempo reale da CoinCap e ogni operazione aggiorna saldo e portafoglio crypto.
                  </Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h5">Criptovalute disponibili</Typography>
                  <Chip label={`${assets.length} asset`} color="primary" size="small" />
                </Stack>
                {marketQuery.isLoading ? (
                  <Stack spacing={1.25}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={`market-skel-${index}`} variant="rounded" height={64} sx={{ bgcolor: 'action.hover' }} />
                    ))}
                  </Stack>
                ) : marketQuery.isError ? (
                  <Alert severity="error" variant="outlined">
                    {marketQuery.error?.message ?? 'Impossibile caricare i prezzi delle crypto.'}
                  </Alert>
                ) : (
                  <Stack spacing={1.5}>
                    {assets.map((asset) => (
                      <Button
                        key={asset.id}
                        component={RouterLink}
                        to={`/market/${asset.id}`}
                        sx={{
                          p: 0,
                          justifyContent: 'flex-start',
                          borderRadius: 3,
                          textTransform: 'none',
                          color: 'text.primary',
                          bgcolor:
                            theme.palette.mode === 'dark'
                              ? alpha(theme.palette.background.paper, 0.4)
                              : theme.palette.background.paper,
                          border: '1px solid',
                          borderColor: 'divider',
                          transition: 'transform 0.2s ease, border-color 0.2s ease',
                          '&:hover': {
                            borderColor: theme.palette.warning.main,
                            transform: 'translateY(-2px)',
                          },
                        }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ width: '100%', py: 1.5, px: 2 }}
                        >
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar
                              src={asset.image ?? undefined}
                              alt={asset.name}
                              sx={{
                                width: 48,
                                height: 48,
                                bgcolor: theme.palette.background.default,
                                border: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              {asset.symbol?.slice(0, 3) ?? asset.name?.slice(0, 2) ?? '?'}
                            </Avatar>
                            <Stack spacing={0.25}>
                              <Typography variant="subtitle1" fontWeight={700}>
                                {asset.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {asset.symbol}
                              </Typography>
                            </Stack>
                          </Stack>
                          <Stack spacing={0.25} alignItems="flex-end">
                            <Typography variant="h6">{formatPrice(asset.price)}</Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                color: asset.change24h >= 0 ? 'primary.main' : 'error.main',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}
                            >
                              {asset.change24h >= 0 ? <FaCaretUp/> : <FaCaretDown/>} {asset.change24h.toFixed(2)}%
                            </Typography>
                          </Stack>
                        </Stack>
                      </Button>
                    ))}
                  </Stack>
                )}
                {assets.length > 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1.5, fontStyle: 'italic', opacity: 0.8 }}
                  >
                    Tocca una riga per aprire la scheda informativa della criptovaluta e scoprire di piu.
                  </Typography>
                ) : null}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {side === 'buy' ? 'Acquista' : 'Vendi'} {selectedAsset?.name}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {accounts.length === 0 ? (
            <Alert severity="warning" variant="outlined">
              Nessun conto disponibile. Crea un conto in EUR per poter operare.
            </Alert>
          ) : null}
          <FormControl fullWidth size="small" disabled={accounts.length === 0 || dialogDisabled}>
            <InputLabel id="market-account-label">Conto</InputLabel>
            <Select
              labelId="market-account-label"
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
            inputProps={{ min: 0, step: '0.0001' }}
          />
          <Typography variant="body2" color="text.secondary">
            Prezzo unitario: {selectedAsset ? formatPrice(selectedAsset.price) : '--'}
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            Totale: {selectedAsset ? formatPrice(tradeValue) : '--'}
          </Typography>
          {formError ? (
            <Alert severity="error" variant="outlined">
              {formError}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} disabled={dialogDisabled}>
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



