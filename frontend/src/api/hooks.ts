import { useMemo } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { useApiClient } from '@/api/useApiClient'

export type Account = {
  id: string
  name: string
  currency: string
  balance: number
  createdAt: string
}

type AccountTopUpApiResponse = {
  id: string
  user_id: string
  currency: string
  balance: string
  name: string
  created_at: string
}

export type AccountTopupRecord = {
  id: string
  accountId: string
  amount: number
  currency: string
  createdAt: string
}

export type Transaction = {
  id: string
  accountId: string
  amount: number
  currency: string
  category: string | null
  direction: 'buy' | 'sell'
  createdAt: string
}

export type Withdrawal = {
  id: string
  accountId: string
  methodId: string
  amount: number
  fee: number
  totalDebit: number
  currency: string
  status: string
  requestedAt: string
  reference: string
}

export type CryptoPosition = {
  id: string
  ticker: string
  name: string
  amount: number
  eurValue: number
  change24hPercent: number | null
  iconUrl: string | null
  priceSource: string | null
  network: string | null
  accountId: string | null
  syncedAt: string | null
  createdAt: string
  updatedAt: string
}

export type WithdrawalMethod = {
  id: string
  userId: string
  type: string
  iban: string
  bic: string | null
  bankName: string | null
  accountHolderName: string
  isDefault: boolean
  status: string
  createdAt: string
  verifiedAt: string | null
}

type AccountListResponse = {
  data: Array<{
    id: string
    user_id: string
    currency: string
    balance: string
    name: string
    created_at: string
  }>
}

type AccountTopupApiRecord = {
  id: string
  user_id: string
  account_id: string
  amount: string
  currency: string
  created_at: string
}

type WithdrawalApiRecord = {
  id: string
  user_id: string
  method_id: string
  account_id: string
  amount: string
  fee: string
  currency: string
  total_debit: string
  status: string
  requested_at: string
  reference: string
}

type OtpSendApiResponse = {
  status: string
  challenge_id: string
  channel_code: string
  expires_at: string
}

type OtpVerifyApiResponse = {
  status: string
  verified_at: string
  expires_at: string
}

type TransactionListResponse = {
  data: Array<{
    id: string
    user_id: string
    account_id: string
    amount: string
    currency: string
    category: string | null
    idem_key: string
    direction: 'buy' | 'sell'
    created_at: string
  }>
}

type CryptoPositionResponse = {
  data: Array<{
    id: string
    ticker: string
    name: string
    amount: string
    eur_value: string
    change_24h_percent: string | null
    icon_url: string | null
    price_source: string | null
    network: string | null
    account_id: string | null
    synced_at: string | null
    created_at: string
    updated_at: string
  }>
  total_eur_value: string
}

export type MarketAsset = {
  id: string
  symbol: string
  name: string
  price: number
  change24h: number
  image?: string | null
  market_cap?: number | null
  explorer_url?: string | null
}

type WithdrawalMethodApiResponse = {
  id: string
  user_id: string
  type: string
  iban: string
  bic: string | null
  bank_name: string | null
  account_holder_name: string
  is_default: boolean
  status: string
  created_at: string
  verified_at: string | null
}

type MarketPricesResponse = {
  data: MarketAsset[]
}

type MarketAssetDetailResponse = {
  asset: MarketAsset
  history: Array<{ timestamp: number; price: number }>
  position: CryptoPosition | null
  transactions: Transaction[]
}

type MarketAssetDetailApiResponse = {
  asset: MarketAsset
  history: Array<{ timestamp: number; price: number }>
  position: {
    id: string
    ticker: string
    name: string
    amount: string | number
    eur_value: string | number
    change_24h_percent: string | number | null
    icon_url: string | null
    price_source: string | null
    network: string | null
    account_id: string | null
    synced_at: string | null
    created_at: string
    updated_at: string
  } | null
  transactions: Array<{
    id: string
    account_id: string
    amount: string | number
    currency: string
    category: string | null
    direction: 'buy' | 'sell'
    created_at: string
  }>
}

export const accountsKey = ['accounts']
export const withdrawalMethodsKey = ['withdrawal-methods']
export const accountTopupsKey = ['account-topups']
export const withdrawalsKey = ['withdrawals']
export const transactionsKey = ['transactions']
export const cryptoPositionsKey = ['crypto-positions']

type CryptoOrderResponse = {
  account: {
    id: string
    user_id: string
    currency: string
    balance: string
    name: string
    created_at: string
  }
  position: {
    id: string
    ticker: string
    name: string
    amount: string
    eur_value: string
    change_24h_percent: string | null
    icon_url: string | null
    price_source: string | null
    network: string | null
    account_id: string | null
    synced_at: string | null
    created_at: string
    updated_at: string
  } | null
}

function parseCurrencyAmount(value: string | number | null | undefined): number {
  if (value == null) {
    return 0
  }
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) {
    return 0
  }
  return numeric
}

export function useAccountsQuery(
  options?: Partial<UseQueryOptions<Account[], Error>> & { enabled?: boolean },
) {
  const apiClient = useApiClient()
  const { enabled = true, ...queryOptions } = options ?? {}

  return useQuery<Account[], Error>({
    queryKey: accountsKey,
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    ...queryOptions,
    queryFn: async () => {
      const response = await apiClient.request<AccountListResponse>({
        path: '/accounts',
      })
      return response.data.map((account) => ({
        id: account.id,
        name: account.name,
        currency: account.currency,
        balance: parseCurrencyAmount(account.balance),
        createdAt: account.created_at,
      }))
    },
  })
}

type AccountTopUpPayload = {
  accountId: string
  amount: number
}

export function useAccountTopUpMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ accountId, amount }: AccountTopUpPayload) => {
      return apiClient.request<AccountTopUpApiResponse>({
        path: `/accounts/${accountId}/topup`,
        method: 'POST',
        body: { amount },
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountsKey })
      void queryClient.invalidateQueries({ queryKey: accountTopupsKey })
    },
  })
}

export function useAccountTopupsQuery(
  options?: Partial<UseQueryOptions<AccountTopupRecord[], Error>> & { enabled?: boolean },
) {
  const apiClient = useApiClient()
  const { enabled = true, ...queryOptions } = options ?? {}

  return useQuery<AccountTopupRecord[], Error>({
    queryKey: accountTopupsKey,
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    ...queryOptions,
    queryFn: async () => {
      const response = await apiClient.request<AccountTopupApiRecord[]>({
        path: '/accounts/topups',
      })
      return response.map((record) => ({
        id: record.id,
        accountId: record.account_id,
        amount: parseCurrencyAmount(record.amount),
        currency: record.currency,
        createdAt: record.created_at,
      }))
    },
  })
}

const mapWithdrawalMethod = (item: WithdrawalMethodApiResponse): WithdrawalMethod => ({
  id: item.id,
  userId: item.user_id,
  type: item.type,
  iban: item.iban,
  bic: item.bic,
  bankName: item.bank_name,
  accountHolderName: item.account_holder_name,
  isDefault: item.is_default,
  status: item.status,
  createdAt: item.created_at,
  verifiedAt: item.verified_at,
})

export function useWithdrawalMethodsQuery(
  options?: Partial<UseQueryOptions<WithdrawalMethod[], Error>> & { enabled?: boolean },
) {
  const apiClient = useApiClient()
  const { enabled = true, ...queryOptions } = options ?? {}

  return useQuery<WithdrawalMethod[], Error>({
    queryKey: withdrawalMethodsKey,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    ...queryOptions,
    queryFn: async () => {
      const response = await apiClient.request<WithdrawalMethodApiResponse[]>({
        path: '/payouts/withdrawal-methods',
      })
      return response.map(mapWithdrawalMethod)
    },
  })
}

type CreateWithdrawalMethodPayload = {
  accountHolderName: string
  iban: string
  bic?: string
  bankName?: string
  isDefault?: boolean
}

export function useCreateWithdrawalMethodMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateWithdrawalMethodPayload) => {
      const response = await apiClient.request<WithdrawalMethodApiResponse>({
        path: '/payouts/withdrawal-methods',
        method: 'POST',
        body: {
          account_holder_name: payload.accountHolderName,
          iban: payload.iban,
          bic: payload.bic,
          bank_name: payload.bankName,
          is_default: payload.isDefault ?? false,
        },
      })
      return mapWithdrawalMethod(response)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: withdrawalMethodsKey })
    },
  })
}

export function useDeleteWithdrawalMethodMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (methodId: string) => {
      await apiClient.request<void>({
        path: `/payouts/withdrawal-methods/${methodId}`,
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: withdrawalMethodsKey })
    },
  })
}

type WithdrawalPayload = {
  accountId: string
  methodId: string
  amount: number
  currency: string
}

export function useWithdrawalMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: WithdrawalPayload) => {
      await apiClient.request({
        path: '/payouts/withdrawals',
        method: 'POST',
        body: {
          account_id: payload.accountId,
          method_id: payload.methodId,
          amount: payload.amount,
          currency: payload.currency,
        },
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: withdrawalsKey })
      void queryClient.invalidateQueries({ queryKey: accountsKey })
    },
  })
}

export function useWithdrawalsQuery(
  options?: Partial<UseQueryOptions<Withdrawal[], Error>> & { enabled?: boolean },
) {
  const apiClient = useApiClient()
  const { enabled = true, ...queryOptions } = options ?? {}

  return useQuery<Withdrawal[], Error>({
    queryKey: withdrawalsKey,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    ...queryOptions,
    queryFn: async () => {
      const response = await apiClient.request<WithdrawalApiRecord[]>({
        path: '/payouts/withdrawals',
      })
      return response.map((record) => ({
        id: record.id,
        accountId: record.account_id,
        methodId: record.method_id,
        amount: parseCurrencyAmount(record.amount),
        fee: parseCurrencyAmount(record.fee),
        totalDebit: parseCurrencyAmount(record.total_debit),
        currency: record.currency,
        status: record.status,
        requestedAt: record.requested_at,
        reference: record.reference,
      }))
    },
  })
}

type OtpSendPayload = {
  channelCode?: string
  destination?: string
  context?: string
  metadata?: Record<string, string>
}

export function useOtpSendMutation() {
  const apiClient = useApiClient()
  return useMutation({
    mutationFn: async (payload?: OtpSendPayload) => {
      const response = await apiClient.request<OtpSendApiResponse>({
        path: '/otp/send',
        method: 'POST',
        body: {
          channel_code: payload?.channelCode,
          destination: payload?.destination,
          context: payload?.context,
          metadata: payload?.metadata,
        },
      })
      return {
        status: response.status,
        challengeId: response.challenge_id,
        channelCode: response.channel_code,
        expiresAt: response.expires_at,
      }
    },
  })
}

type OtpVerifyPayload = {
  challengeId: string
  code: string
}

export function useOtpVerifyMutation() {
  const apiClient = useApiClient()
  return useMutation({
    mutationFn: async ({ challengeId, code }: OtpVerifyPayload) => {
      const response = await apiClient.request<OtpVerifyApiResponse>({
        path: '/otp/verify',
        method: 'POST',
        body: {
          challenge_id: challengeId,
          code,
        },
      })
      return {
        status: response.status,
        verifiedAt: response.verified_at,
        expiresAt: response.expires_at,
      }
    },
  })
}

export function useTransactionsQuery(
  options?: Partial<UseQueryOptions<Transaction[], Error>> & {
    enabled?: boolean
    take?: number
  },
) {
  const apiClient = useApiClient()
  const { enabled = true, take, select, ...queryOptions } = options ?? {}

  return useQuery<Transaction[], Error>({
    queryKey: transactionsKey,
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    ...queryOptions,
    select:
      select ??
      ((transactions: Transaction[]) => {
        if (take != null) {
          return transactions.slice(0, take)
        }
        return transactions
      }),
    queryFn: async () => {
      const response = await apiClient.request<TransactionListResponse>({
        path: '/transactions',
      })
      return response.data.map((transaction) => ({
        id: transaction.id,
        accountId: transaction.account_id,
        amount: parseCurrencyAmount(transaction.amount),
        currency: transaction.currency,
        category: transaction.category,
        direction: transaction.direction,
        createdAt: transaction.created_at,
      }))
    },
  })
}

export const useAccountSummary = (accounts: Account[] | undefined) =>
  useMemo(() => {
    if (!accounts || accounts.length === 0) {
      return { totalBalance: 0, currency: undefined as string | undefined }
    }
    // assume same currency for summary (first account)
    const currency = accounts[0]?.currency
    const totalBalance = accounts.reduce((acc, account) => acc + account.balance, 0)
    return { totalBalance, currency }
  }, [accounts])

export function useCryptoPositionsQuery(
  options?: Partial<UseQueryOptions<{ positions: CryptoPosition[]; totalValue: number }, Error>> & {
    enabled?: boolean
  },
) {
  const apiClient = useApiClient()
  const { enabled = true, ...queryOptions } = options ?? {}

  return useQuery<{ positions: CryptoPosition[]; totalValue: number }, Error>({
    queryKey: cryptoPositionsKey,
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    ...queryOptions,
    queryFn: async () => {
      const response = await apiClient.request<CryptoPositionResponse>({
        path: '/crypto-positions',
      })
      const positions = response.data.map((item) => ({
        id: item.id,
        ticker: item.ticker,
        name: item.name,
        amount: parseCurrencyAmount(item.amount),
        eurValue: parseCurrencyAmount(item.eur_value),
        change24hPercent: item.change_24h_percent != null ? Number(item.change_24h_percent) : null,
        iconUrl: item.icon_url,
        priceSource: item.price_source,
        network: item.network,
        accountId: item.account_id,
        syncedAt: item.synced_at,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }))
      return {
        positions,
        totalValue: parseCurrencyAmount(response.total_eur_value),
      }
    },
  })
}

type TradePayload = {
  accountId: string
  assetSymbol: string
  assetName: string
  priceEur: number
  quantity: number
  side: 'buy' | 'sell'
}

export function useCryptoTradeMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: TradePayload) => {
      return apiClient.request<CryptoOrderResponse>({
        path: '/market/orders',
        method: 'POST',
        body: {
          account_id: payload.accountId,
          asset_symbol: payload.assetSymbol,
          asset_name: payload.assetName,
          price_eur: payload.priceEur,
          quantity: payload.quantity,
          side: payload.side,
        },
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountsKey })
      void queryClient.invalidateQueries({ queryKey: cryptoPositionsKey })
    },
  })
}

type PasswordChangePayload = {
  currentPassword: string
  newPassword: string
}

export function usePasswordChangeMutation() {
  const apiClient = useApiClient()
  return useMutation({
    mutationFn: async (payload: PasswordChangePayload) => {
      await apiClient.request({
        path: '/profile/password',
        method: 'POST',
        body: payload,
      })
    },
  })
}

type ProfileUpdatePayload = {
  firstName?: string
  lastName?: string
  email?: string
}

export function useProfileUpdateMutation() {
  const apiClient = useApiClient()
  return useMutation({
    mutationFn: async (payload: ProfileUpdatePayload) => {
      await apiClient.request({
        path: '/profile',
        method: 'PUT',
        body: payload,
      })
    },
  })
}

type ProfileDeletePayload = {
  currentPassword: string
}

export function useProfileDeleteMutation() {
  const apiClient = useApiClient()
  return useMutation({
    mutationFn: async (payload: ProfileDeletePayload) => {
      await apiClient.request({
        path: '/profile',
        method: 'DELETE',
        body: payload,
      })
    },
  })
}

export function useMarketPricesQuery(
  options?: Partial<UseQueryOptions<MarketAsset[], Error>> & { enabled?: boolean },
) {
  const apiClient = useApiClient()
  const { enabled = true, ...queryOptions } = options ?? {}

  return useQuery<MarketAsset[], Error>({
    queryKey: ['market-prices'],
    enabled,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    ...queryOptions,
    queryFn: async () => {
      const response = await apiClient.request<MarketPricesResponse>({ path: '/market/prices' })
      return response.data
    },
  })
}

export function useMarketAssetQuery(
  assetId: string,
  options?: Partial<UseQueryOptions<MarketAssetDetailResponse, Error>> & { enabled?: boolean },
) {
  const apiClient = useApiClient()
  const { enabled = true, ...queryOptions } = options ?? {}

  return useQuery<MarketAssetDetailResponse, Error>({
    queryKey: ['market-asset', assetId],
    enabled: enabled && Boolean(assetId),
    staleTime: 120_000,
    ...queryOptions,
    queryFn: async () => {
      if (!assetId) {
        throw new Error('Asset non specificato')
      }
      const response = await apiClient.request<MarketAssetDetailApiResponse>({
        path: `/market/assets/${assetId}`,
      })
      const position = response.position
        ? {
            id: response.position.id,
            ticker: response.position.ticker,
            name: response.position.name,
            amount: parseCurrencyAmount(response.position.amount),
            eurValue: parseCurrencyAmount(response.position.eur_value),
            change24hPercent:
              response.position.change_24h_percent != null
                ? Number(response.position.change_24h_percent)
                : null,
            iconUrl: response.position.icon_url,
            priceSource: response.position.price_source,
            network: response.position.network,
            accountId: response.position.account_id,
            syncedAt: response.position.synced_at,
            createdAt: response.position.created_at,
            updatedAt: response.position.updated_at,
          }
        : null
      const transactions = response.transactions.map((transaction) => ({
        id: transaction.id,
        accountId: transaction.account_id,
        amount: parseCurrencyAmount(transaction.amount),
        currency: transaction.currency,
        category: transaction.category,
        direction: transaction.direction,
        createdAt: transaction.created_at,
      }))
      return {
        asset: response.asset,
        history: response.history,
        position,
        transactions,
      }
    },
  })
}
