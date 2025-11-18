import { Route, Routes } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { AuthCallbackPage } from '@/routes/AuthCallbackPage'
import { SilentRenewPage } from '@/routes/SilentRenewPage'
import { NotFoundPage } from '@/routes/NotFoundPage'
import { appConfig } from '@/config/appConfig'
import { AppLayout } from '@/layouts/AppLayout'
import { MarketPage } from '@/pages/MarketPage'
import { MarketAssetPage } from '@/pages/MarketAssetPage'
import { ProfilePage } from '@/pages/ProfilePage'

const stripLeadingSlash = (path: string) =>
  path === '/' ? '' : path.replace(/^\//, '')

export function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path={stripLeadingSlash(appConfig.routes.market)} element={<MarketPage />} />
        <Route
          path={`${stripLeadingSlash(appConfig.routes.market)}/:ticker`}
          element={<MarketAssetPage />}
        />
        <Route path={stripLeadingSlash(appConfig.routes.profile)} element={<ProfilePage />} />
      </Route>
      <Route path={appConfig.routes.authCallback} element={<AuthCallbackPage />} />
      <Route path={appConfig.routes.silentRefresh} element={<SilentRenewPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
