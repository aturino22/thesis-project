import { useCallback, useMemo, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import { NavLink } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { appConfig } from '@/config/appConfig'

type LinkNavItem = {
  type: 'link'
  label: string
  path: string
  exact?: boolean
}

type ActionNavItem = {
  type: 'action'
  label: string
  onClick: () => void
}

type NavItem = LinkNavItem | ActionNavItem

type UserProfile = Partial<{
  preferred_username: string
  name: string
  given_name: string
  nickname: string
  email: string
}>

const resolveDisplayName = (auth: ReturnType<typeof useAuth>) => {
  const profile = (auth.user?.profile as UserProfile | undefined) ?? {}
  return (
    profile.preferred_username ??
    profile.name ??
    profile.given_name ??
    profile.nickname ??
    profile.email ??
    'Profilo'
  )
}

export function Navbar() {
  const auth = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const displayName = resolveDisplayName(auth)

  const handleLogout = useCallback(() => {
    void auth
      .signoutRedirect({
        post_logout_redirect_uri: appConfig.oidc.postLogoutRedirectUri,
      })
      .catch((error) => {
        console.error('OIDC logout error', error)
      })
  }, [auth])

  const navItems: NavItem[] = useMemo(
    () => [
      { type: 'link', label: 'Home', path: appConfig.routes.home, exact: true },
      { type: 'link', label: 'Accounts', path: appConfig.routes.accounts },
      { type: 'link', label: 'Market', path: appConfig.routes.market },
      { type: 'link', label: displayName, path: appConfig.routes.profile },
      { type: 'action', label: 'Logout', onClick: handleLogout },
    ],
    [displayName, handleLogout],
  )

  const toggleMobileMenu = () => setMobileOpen((prev) => !prev)
  const closeMobileMenu = () => setMobileOpen(false)
  const handleActionClick = (action: () => void) => {
    closeMobileMenu()
    action()
  }

  const renderNavButton = (item: NavItem) => {
    if (item.type === 'action') {
      return (
        <Button
          key={item.label}
          onClick={() => handleActionClick(item.onClick)}
          disableRipple
          sx={{
            color: 'error.main',
            opacity: 0.85,
            fontWeight: 600,
            borderRadius: 999,
            textTransform: 'none',
            px: 2,
          }}
        >
          {item.label}
        </Button>
      )
    }
    return (
      <Button
        key={item.path}
        component={NavLink}
        to={item.path}
        end={item.exact}
        disableRipple
        onClick={closeMobileMenu}
        sx={{
          color: 'text.primary',
          opacity: 0.65,
          fontWeight: 500,
          borderRadius: 999,
          textTransform: 'none',
          px: 2,
          '&.active': {
            opacity: 1,
            fontWeight: 700,
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
          },
        }}
      >
        {item.label}
      </Button>
    )
  }

  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(2, 6, 23, 0.8)',
      }}
    >
      <Toolbar sx={{ minHeight: 72, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flex: 1 }} />

        <Box sx={{ textAlign: 'center', flexShrink: 0 }}>
          <Typography variant="h6" component="div" fontWeight={700}>
            {appConfig.appName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Dashboard utente
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
            {navItems.map((item) => renderNavButton(item))}
          </Stack>

          <IconButton
            color="inherit"
            onClick={toggleMobileMenu}
            sx={{ display: { xs: 'flex', md: 'none' } }}
            aria-label="Apri menu di navigazione"
          >
            <MenuIcon />
          </IconButton>
        </Box>
      </Toolbar>

      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={closeMobileMenu}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: 280,
            backgroundColor: 'rgba(3, 7, 18, 0.95)',
            color: 'text.primary',
            backdropFilter: 'blur(12px)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {appConfig.appName}
          </Typography>
          <IconButton color="inherit" onClick={closeMobileMenu} aria-label="Chiudi menu">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <List>
          {navItems.map((item) => (
            <ListItem key={item.type === 'link' ? item.path : item.label} disablePadding>
              {item.type === 'link' ? (
                <ListItemButton
                  component={NavLink}
                  to={item.path}
                  end={item.exact}
                  onClick={closeMobileMenu}
                  sx={{
                    '&.active .MuiListItemText-primary': {
                      fontWeight: 700,
                      color: 'primary.main',
                    },
                  }}
                >
                  <ListItemText
                    primaryTypographyProps={{ fontWeight: 500, textTransform: 'none' }}
                    primary={item.label}
                  />
                </ListItemButton>
              ) : (
                <ListItemButton
                  onClick={() => handleActionClick(item.onClick)}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontWeight: 600,
                      color: 'error.main',
                    },
                  }}
                >
                  <ListItemText primary={item.label} />
                </ListItemButton>
              )}
            </ListItem>
          ))}
        </List>
      </Drawer>
    </AppBar>
  )
}
