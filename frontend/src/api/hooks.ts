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

export type Transaction = {
  id: string
  accountId: string
  amount: number
  currency: string
  category: string | null
  direction: 'buy' | 'sell'
  createdAt: string
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
