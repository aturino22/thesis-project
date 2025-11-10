import {
  Alert,
  Box,
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
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAccountsQuery, useAccountSummary } from '@/api/hooks'

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
  }).format(amount)

export function AccountsPage() {
  const query = useAccountsQuery({ enabled: true })
  const accounts = query.data ?? []
  const summary = useAccountSummary(accounts)

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
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  )
}

