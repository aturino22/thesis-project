import { extendTheme, type CssVarsThemeOptions } from '@mui/material/styles'

const sharedPalette = {
  background: {
    default: '#000000',
    paper: '#021204',
  },
  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
  },
  divider: 'rgba(0, 200, 83, 0.2)',
}

const themeOptions: CssVarsThemeOptions = {
  defaultColorScheme: 'light',
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: '#8ab4ff',
        },
        secondary: {
          main: '#ffb68d',
        },
        ...sharedPalette,
      },
    },
    dark: {
      palette: {
        primary: {
          main: '#8ab4ff',
        },
        secondary: {
          main: '#ffb68d',
        },
        ...sharedPalette,
      },
    },
  },
  shape: {
    borderRadius: 18,
  },
  typography: {
    fontFamily: "'Roboto', 'Inter', 'Segoe UI', sans-serif",
    h3: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          border: '1px solid rgba(0, 200, 83, 0.25)',
          backgroundColor: '#021204',
          boxShadow: '0 0 32px rgba(0, 200, 83, 0.18)',
        },
      },
      defaultProps: {
        elevation: 0,
        variant: 'outlined',
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
        },
      },
    },
    MuiContainer: {
      defaultProps: {
        maxWidth: 'lg',
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 40,
        },
      },
    },
  },
}

export const theme = extendTheme(themeOptions)
