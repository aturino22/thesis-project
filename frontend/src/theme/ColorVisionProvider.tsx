import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { createAppTheme, type ColorVisionMode } from '@/theme'

type ColorVisionContextValue = {
  mode: ColorVisionMode
  setMode: (mode: ColorVisionMode) => void
}

const ColorVisionContext = createContext<ColorVisionContextValue | undefined>(undefined)

const storageKey = 'colorVisionMode'

const getStoredMode = (): ColorVisionMode => {
  if (typeof window === 'undefined') {
    return 'default'
  }
  const stored = window.localStorage.getItem(storageKey)
  return stored === 'daltonic' ? 'daltonic' : 'default'
}

export function ColorVisionThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ColorVisionMode>(() => getStoredMode())

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, mode)
    }
  }, [mode])

  const theme = useMemo(() => createAppTheme(mode), [mode])

  return (
    <ColorVisionContext.Provider value={{ mode, setMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorVisionContext.Provider>
  )
}

export function useColorVisionMode() {
  const context = useContext(ColorVisionContext)
  if (!context) {
    throw new Error('useColorVisionMode deve essere usato dentro ColorVisionThemeProvider')
  }
  return context
}
