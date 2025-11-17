import { extendTheme, type CssVarsThemeOptions, type PaletteOptions } from '@mui/material/styles'

export type ColorVisionMode = 'default' | 'daltonic'

const palette: Record<ColorVisionMode, PaletteOptions> = {
  default: {
    primary: { main: '#1ED760', light: '#4BE784', dark: '#0F9F44', contrastText: '#041307' },
    secondary: { main: '#7C4DFF', light: '#B08DFF', dark: '#4A1FB7' },
    success: { main: '#00C78E' },
    warning: { main: '#FFB347' },
    error: { main: '#FF5F5F' },
    info: { main: '#7DA4FF' },
    background: { default: '#050F0B', paper: '#0C1713' },
    text: { primary: '#ECF4EF', secondary: '#B6C3BC' },
    divider: 'rgba(236, 244, 239, 0.12)',
  },
  daltonic: {
    primary: { main: '#0072B2', light: '#56B4E9', dark: '#004A76', contrastText: '#FFFFFF' },
    secondary: { main: '#56B4E9' },
    success: { main: '#009E73' },
    warning: { main: '#E69F00' },
    error: { main: '#D55E00' },
    info: { main: '#56B4E9' },
    background: { default: '#FFFFFF', paper: '#F6F6F6' },
    text: { primary: '#000000', secondary: '#666666' },
    divider: '#3A3A3A',
  },
}

const themeOptions = (mode: ColorVisionMode): CssVarsThemeOptions => ({
  defaultColorScheme: 'dark',
  colorSchemes: {
    dark: {
      palette: palette[mode],
    },
  },
  shape: {
    borderRadius: 20,
  },
  typography: {
    fontFamily: "'Inter', 'Montserrat', 'Segoe UI', sans-serif",
    h3: {
      fontWeight: 700,
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
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: palette[mode].background?.default,
          color: palette[mode].text?.primary,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          border: `1px solid ${palette[mode].divider ?? 'rgba(0,0,0,0.08)'}`,
          backgroundColor: palette[mode].background?.paper,
          color: palette[mode].text?.primary,
          boxShadow: '0 10px 35px rgba(0, 0, 0, 0.5)',
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
          fontWeight: 600,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingLeft: 20,
          paddingRight: 20,
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
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: {
          borderColor: mode === 'daltonic' ? '#000000' : undefined,
        },
      },
    },
  },
})

export const createAppTheme = (mode: ColorVisionMode = 'default') => extendTheme(themeOptions(mode))

export const theme = createAppTheme()
