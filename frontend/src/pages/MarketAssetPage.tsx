import { useMemo } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import { useMarketAssetQuery } from '@/api/hooks'

const formatPrice = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)

const formatDateTime = (value: string) => new Date(value).toLocaleString('it-IT')

export function MarketAssetPage() {
  const { ticker: assetIdentifier = '' } = useParams<{ ticker: string }>()
  const assetDetail = useMarketAssetQuery(assetIdentifier, { enabled: Boolean(assetIdentifier) })
  const asset = assetDetail.data?.asset
  const history = useMemo(() => assetDetail.data?.history ?? [], [assetDetail.data?.history])
  const position = assetDetail.data?.position ?? null
  const transactions = assetDetail.data?.transactions ?? []

  const chartCoordinates = useMemo(() => {
    if (!history.length) {
      return { polyline: '', polygon: '' }
    }
    const prices = history.map((point) => point.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const range = max - min || 1
    const coords = history.map((point, index) => {
      const x = history.length === 1 ? 50 : (index / (history.length - 1)) * 100
      const normalized = (point.price - min) / range
      const y = 90 - normalized * 70
      return `${Number(x.toFixed(2))},${Number(y.toFixed(2))}`
    })
    return {
      polyline: coords.join(' '),
      polygon: `${coords.join(' ')} 100,100 0,100`,
    }
  }, [history])

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

  return (
    <Box component="section" sx={{ bgcolor: '#000000', py: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Button
            variant="text"
            startIcon={<ArrowBackRoundedIcon />}
            component={RouterLink}
            to="/market"
            sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}
          >
            Torna al market
          </Button>

          <Card
            sx={{
              borderRadius: 3,
              backgroundColor: 'background.paper',
              border: '1px solid rgba(241,196,15,0.25)',
            }}
          >
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Stack spacing={0.5}>
                <Typography variant="overline" color="text.secondary">
                  Asset
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {asset.name} ({asset.symbol})
                </Typography>
                <Typography variant="h5" color="primary.main">
                  {formatPrice(asset.price)}
                </Typography>
                <Chip
                  label={`${asset.change24h >= 0 ? '+' : ''}${asset.change24h.toFixed(2)}%`}
                  color={asset.change24h >= 0 ? 'success' : 'error'}
                  size="small"
                  sx={{ alignSelf: 'flex-start' }}
                />
              </Stack>
            </CardContent>
          </Card>

          <Card
            sx={{
              borderRadius: 3,
              backgroundColor: 'background.paper',
              border: '1px solid rgba(0,200,83,0.25)',
            }}
          >
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="overline" color="text.secondary">
                Andamento ultimi 7 giorni
              </Typography>
              <Box sx={{ position: 'relative', height: 260 }}>
                {history.length === 0 ? (
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    sx={{ height: '100%' }}
                    spacing={1}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Storico non disponibile in questo momento.
                    </Typography>
                  </Stack>
                ) : (
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">
                    <defs>
                      <linearGradient id="assetGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(0, 200, 83, 0.35)" />
                        <stop offset="100%" stopColor="rgba(4, 7, 5, 0)" />
                      </linearGradient>
                    </defs>
                    <rect width="100%" height="100%" fill="rgba(255,255,255,0.02)" rx="4" />
                    {chartCoordinates.polyline ? (
                      <>
                        <polygon
                          points={chartCoordinates.polygon}
                          fill="url(#assetGradient)"
                          opacity={0.4}
                        />
                        <polyline
                          points={chartCoordinates.polyline}
                          fill="none"
                          stroke="rgba(0, 200, 83, 0.9)"
                          strokeWidth={2}
                          strokeLinecap="round"
                        />
                      </>
                    ) : null}
                  </svg>
                )}
              </Box>
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  borderRadius: 3,
                  backgroundColor: 'background.paper',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="overline" color="text.secondary">
                    Investimento
                  </Typography>
                  {position ? (
                    <Stack spacing={1}>
                      <Typography variant="body1">Quantita posseduta</Typography>
                      <Typography variant="h4" fontWeight={700}>
                        {position.amount.toLocaleString('it-IT', { maximumFractionDigits: 6 })}{' '}
                        {position.ticker}
                      </Typography>
                      <Divider />
                      <Typography variant="body2" color="text.secondary">
                        Valore totale stimato
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        {formatPrice(position.eurValue)}
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Non possiedi ancora questa criptovaluta. Effettua un acquisto dal market.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  borderRadius: 3,
                  backgroundColor: 'background.paper',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="overline" color="text.secondary">
                    Transazioni recenti
                  </Typography>
                  <Divider />
                  {transactions.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Nessuna transazione registrata per questo asset.
                    </Typography>
                  ) : (
                    <List disablePadding>
                      {transactions.map((transaction, index) => (
                        <ListItem
                          key={transaction.id}
                          disableGutters
                          sx={{
                            alignItems: 'flex-start',
                            py: 1,
                            borderBottom:
                              index === transactions.length - 1
                                ? 'none'
                                : '1px solid rgba(255,255,255,0.08)',
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
                                  color={transaction.direction === 'sell' ? 'error.main' : 'success.main'}
                                >
                                  {transaction.direction === 'sell' ? '-' : '+'}
                                  {formatPrice(transaction.amount)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatDateTime(transaction.createdAt)}
                                </Typography>
                              </Stack>
                            }
                            secondary={
                              <Typography variant="body2" color="text.secondary">
                                {transaction.direction === 'sell' ? 'Vendita' : 'Acquisto'} su conto{' '}
                                {transaction.accountId}
                              </Typography>
                            }
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
      </Container>
    </Box>
  )
}
