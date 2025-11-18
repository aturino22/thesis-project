import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAccountTopUpMutation, useAccountsQuery, useAccountSummary } from '@/api/hooks'

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
  }).format(amount)

export function AccountsPage() {
  const query = useAccountsQuery({ enabled: true })
  const accounts = query.data ?? []
  const summary = useAccountSummary(accounts)
  const [topupDialogOpen, setTopupDialogOpen] = useState(false)
  const [topupAccountId, setTopupAccountId] = useState('')
  const [topupAmount, setTopupAmount] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [topupError, setTopupError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const topupMutation = useAccountTopUpMutation()

  const resolvedTopupAccount = useMemo(() => {
    if (!accounts.length) {
      return null
    }
    return accounts.find((account) => account.id === topupAccountId) ?? accounts[0]
  }, [accounts, topupAccountId])

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
      setFeedback({
        type: 'success',
        message: `Saldo del conto "${resolvedTopupAccount.name}" incrementato di ${formatCurrency(
          numericAmount,
          resolvedTopupAccount.currency,
        )}.`,
      })
    } catch (error) {
      setTopupError(error instanceof Error ? error.message : 'Operazione non riuscita.')
      setFeedback({
        type: 'error',
        message: "Impossibile completare la ricarica. Riprova piu tardi.",
      })
    }
  }

  return (
    <Box component="section" sx={{ py: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <div>
            <Typography variant="overline" color="text.secondary">
              Navigazione
            </Typography>
            <Typography variant="h3" fontWeight={700}>
              Accounts
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Lista completa dei conti disponibili per l’utente autenticato con dettagli su saldo e
              data di creazione.
            </Typography>
          </div>

          {feedback ? (
            <Alert
              severity={feedback.type}
              variant="outlined"
              onClose={() => setFeedback(null)}
              sx={{ borderRadius: 2 }}
            >
              {feedback.message}
            </Alert>
          ) : null}

          <Card>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                spacing={1}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
              >
                <Stack spacing={0.5}>
                  <Typography variant="h5">Portafoglio complessivo</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Somma dei saldi riportati dai conti attivi
                  </Typography>
                </Stack>
                <Chip
                  size="small"
                  color="primary"
                  label={`${accounts.length} ${accounts.length === 1 ? 'conto' : 'conti'}`}
                />
              </Stack>
              <Typography variant="h4" fontWeight={700}>
                {query.isLoading || !summary.currency
                  ? '—'
                  : formatCurrency(summary.totalBalance, summary.currency)}
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Stack spacing={0.25}>
                <Typography variant="overline" color="text.secondary">
                  Elenco conti
                </Typography>
                <Typography variant="h5">Dettaglio</Typography>
              </Stack>
              <Divider />
              {query.isLoading ? (
                <Stack spacing={1.25}>
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <Skeleton key={`acc-skel-${idx}`} variant="rounded" height={48} />
                  ))}
                </Stack>
              ) : query.isError ? (
                <Alert severity="error" variant="outlined">
                  {query.error.message}
                </Alert>
              ) : accounts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nessun conto disponibile per l’utente corrente.
                </Typography>
              ) : (
                <List disablePadding>
                  {accounts.map((account, index) => (
                    <ListItem
                      key={account.id}
                      disableGutters
                      sx={{
                        alignItems: 'flex-start',
                        py: 1.25,
                        borderBottom:
                          index === accounts.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.08)',
                      }}
                        >
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            justifyContent="space-between"
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                            sx={{ width: '100%' }}
                          >
                            <ListItemText
                              primary={
                                <Stack
                                  direction={{ xs: 'column', sm: 'row' }}
                                  spacing={1.5}
                                  justifyContent="space-between"
                                >
                                  <Typography variant="subtitle1" fontWeight={600}>
                                    {account.name}
                                  </Typography>
                                  <Typography variant="body1" fontWeight={600}>
                                    {formatCurrency(account.balance, account.currency)}
                                  </Typography>
                                </Stack>
                              }
                              secondary={
                                <Typography variant="body2" color="text.secondary">
                                  Creato il{' '}
                                  {format(new Date(account.createdAt), "d MMMM yyyy 'alle' HH:mm", {
                                    locale: it,
                                  })}
                                </Typography>
                              }
                            />
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleOpenTopupDialog(account.id)}
                            >
                              Ricarica
                            </Button>
                          </Stack>
                        </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Container>

      <Dialog open={topupDialogOpen} onClose={handleCloseTopupDialog} fullWidth maxWidth="sm">
        <DialogTitle>Ricarica saldo</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {!resolvedTopupAccount ? (
            <Alert severity="warning" variant="outlined">
              Non esistono conti da ricaricare.
            </Alert>
          ) : (
            <>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
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
                    const formatted =
                      sliced.length <= 2 ? sliced : `${sliced.slice(0, 2)}/${sliced.slice(2, 6)}`
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
                La ricarica e simulata e non genera alcun addebito reale.
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
            disabled={topupMutation.isPending || accounts.length === 0}
          >
            {topupMutation.isPending ? 'In corso...' : 'Ricarica'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

