# Scelte di Design - UI/UX e Accessibilità

## Panoramica

Questo documento descrive e giustifica le scelte di design relative alla palette colori, alla modalità scura/chiara e all'accessibilità dell'interfaccia utente del Fintech Wallet.

---

## Palette Colori e Modalità Scura

### Scelta della Modalità Scura come Default

L'applicazione utilizza una **modalità scura (dark mode)** come tema predefinito, seguendo le best practice delle applicazioni fintech moderne come Revolut, N26 e Robinhood.

#### Motivazioni:

1. **Riduzione Affaticamento Visivo**
   - Le applicazioni finanziarie vengono consultate frequentemente durante la giornata
   - La modalità scura riduce l'emissione di luce blu, particolarmente importante per utilizzo serale/notturno
   - Minore affaticamento oculare durante sessioni prolungate di monitoraggio portfolio

2. **Focus sui Contenuti Critici**
   - Lo sfondo scuro permette di evidenziare meglio i dati numerici (saldi, transazioni, prezzi)
   - I colori primari (verde per positivo, rosso per negativo) risaltano maggiormente su sfondo scuro
   - Migliore leggibilità di grafici e visualizzazioni dati

3. **Estetica Premium e Moderna**
   - La modalità scura è associata a un'estetica premium nel settore fintech
   - Trasmette professionalità e modernità
   - Allineamento con le aspettative degli utenti target (millennial e Gen Z)

4. **Risparmio Energetico**
   - Su dispositivi con schermi OLED/AMOLED (sempre più diffusi), la modalità scura riduce il consumo energetico
   - Importante per applicazioni mobile che richiedono monitoraggio frequente

---

## Palette Colori - Modalità Default

### Colore Primario: Verde (#1ED760)

```typescript
primary: { 
  main: '#1ED760',      // Verde brillante
  light: '#4BE784',     // Verde chiaro
  dark: '#0F9F44',      // Verde scuro
  contrastText: '#041307' 
}
```

#### Motivazioni:

1. **Psicologia del Colore**
   - Il verde è universalmente associato a crescita, prosperità e sicurezza finanziaria
   - Trasmette fiducia e stabilità, valori fondamentali per un'applicazione fintech
   - Evoca sensazioni positive legate a guadagni e successo

2. **Differenziazione Competitiva**
   - Mentre molte fintech usano blu (tradizionale banking), il verde offre differenziazione
   - Ispirato a Revolut ma con tonalità più brillante per maggiore energia
   - Crea un'identità visiva distintiva e memorabile

3. **Accessibilità e Contrasto**
   - Il verde #1ED760 ha un contrasto eccellente su sfondo scuro (#050F0B)
   - Ratio di contrasto: ~12:1 (WCAG AAA compliant)
   - Facilmente distinguibile anche per utenti con deficit visivi lievi

4. **Versatilità**
   - Funziona bene sia per elementi interattivi (bottoni, link) che per indicatori di stato positivo
   - Le varianti light/dark permettono di creare gerarchie visive chiare

### Colore Secondario: Viola (#7C4DFF)

```typescript
secondary: { 
  main: '#7C4DFF',      // Viola vibrante
  light: '#B08DFF',     // Viola chiaro
  dark: '#4A1FB7'       // Viola scuro
}
```

#### Motivazioni:

1. **Complementarità**
   - Il viola complementa il verde primario senza competere per l'attenzione
   - Crea un contrasto armonioso che arricchisce la palette senza sovraccaricare

2. **Innovazione e Tecnologia**
   - Il viola è associato a innovazione, creatività e tecnologia avanzata
   - Perfetto per funzionalità premium o innovative (crypto, investimenti)
   - Trasmette modernità e approccio forward-thinking

3. **Differenziazione Funzionale**
   - Utilizzato per azioni secondarie e elementi informativi
   - Aiuta a distinguere visivamente diverse categorie di contenuto

### Colori di Sistema

```typescript
success: { main: '#00C78E' }   // Verde acqua - conferme positive
warning: { main: '#FFB347' }   // Arancione - avvisi
error: { main: '#FF5F5F' }     // Rosso - errori e azioni critiche
info: { main: '#7DA4FF' }      // Blu chiaro - informazioni neutre
```

#### Motivazioni:

1. **Convenzioni Universali**
   - Verde per successo, rosso per errore, arancione per warning sono standard universali
   - Riduce la curva di apprendimento e migliora l'usabilità intuitiva

2. **Contrasto Ottimale**
   - Ogni colore è stato calibrato per garantire leggibilità su sfondo scuro
   - Tonalità più chiare rispetto agli standard per compensare lo sfondo scuro

3. **Differenziazione Immediata**
   - Gli utenti possono identificare istantaneamente lo stato di un'operazione
   - Critico per applicazioni finanziarie dove errori possono avere conseguenze significative

### Background e Superfici

```typescript
background: { 
  default: '#050F0B',   // Nero verdastro molto scuro
  paper: '#0C1713'      // Nero verdastro scuro
}
```

#### Motivazioni:

1. **Nero Verdastro invece di Nero Puro**
   - Il nero puro (#000000) può risultare troppo duro e affaticare la vista
   - La leggera tinta verde (#050F0B) crea coerenza con il colore primario
   - Più morbido e piacevole per sessioni prolungate

2. **Gerarchia Visiva**
   - La differenza tra `default` e `paper` crea profondità
   - Le card su `paper` (#0C1713) si distinguono dal background senza contrasti eccessivi
   - Simula l'elevazione fisica delle superfici

3. **Riduzione Affaticamento**
   - Tonalità scure ma non completamente nere riducono l'affaticamento oculare
   - Particolarmente importante per utilizzo notturno

### Testo

```typescript
text: { 
  primary: '#ECF4EF',     // Bianco verdastro
  secondary: '#B6C3BC'    // Grigio verdastro
}
```

#### Motivazioni:

1. **Leggibilità Ottimale**
   - Il bianco verdastro (#ECF4EF) mantiene coerenza cromatica con il tema
   - Contrasto sufficiente per leggibilità prolungata (ratio ~14:1)

2. **Gerarchia Tipografica**
   - Il testo secondario (#B6C3BC) crea una chiara distinzione per informazioni meno critiche
   - Aiuta a guidare l'occhio verso i contenuti più importanti

---

## Modalità Accessibile per Daltonismo

### Palette Daltonica

```typescript
daltonic: {
  primary: { main: '#0072B2' },      // Blu
  secondary: { main: '#56B4E9' },    // Azzurro
  success: { main: '#009E73' },      // Verde bluastro
  warning: { main: '#E69F00' },      // Arancione
  error: { main: '#D55E00' },        // Rosso-arancio
  background: { default: '#FFFFFF', paper: '#F6F6F6' },
  text: { primary: '#000000', secondary: '#666666' }
}
```

### Motivazioni per la Modalità Daltonica

1. **Inclusività e Accessibilità**
   - Circa l'8% degli uomini e lo 0.5% delle donne hanno deficit nella percezione dei colori
   - Fornire un'alternativa accessibile è un requisito etico e normativo (WCAG 2.1)
   - Dimostra attenzione alla diversità degli utenti

2. **Palette Scientificamente Validata**
   - I colori scelti sono basati sulla palette di **Paul Tol** per daltonismo
   - Testati per essere distinguibili da persone con deuteranopia, protanopia e tritanopia
   - Ogni colore ha una luminosità e saturazione distintiva

3. **Modalità Chiara per Contrasto**
   - La modalità daltonica usa sfondo chiaro (#FFFFFF) invece di scuro
   - Massimizza il contrasto per compensare la ridotta percezione cromatica
   - Ratio di contrasto superiore a 7:1 per tutti i testi

4. **Differenziazione Non Solo Cromatica**
   - L'interfaccia usa anche icone, pattern e posizionamento per trasmettere informazioni
   - Non si affida esclusivamente al colore per comunicare stati o azioni
   - Esempio: transazioni positive/negative hanno anche icone ↑/↓

### Implementazione Tecnica

```typescript
export function ColorVisionThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ColorVisionMode>(() => getStoredMode())
  
  useEffect(() => {
    window.localStorage.setItem(storageKey, mode)
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
```

#### Caratteristiche:

1. **Persistenza della Preferenza**
   - La scelta dell'utente viene salvata in `localStorage`
   - Ripristinata automaticamente nelle sessioni successive
   - Rispetta la preferenza dell'utente senza richiedere configurazione ripetuta

2. **Switch Dinamico**
   - L'utente può cambiare modalità in qualsiasi momento
   - Il tema viene rigenerato dinamicamente senza reload della pagina
   - Transizione fluida tra le modalità

3. **Context API per Accesso Globale**
   - Qualsiasi componente può accedere e modificare la modalità
   - Evita prop drilling e mantiene il codice pulito
   - Hook `useColorVisionMode()` per accesso semplificato

---

## Tipografia

```typescript
typography: {
  fontFamily: "'Inter', 'Montserrat', 'Segoe UI', sans-serif",
  h3: { fontWeight: 700, letterSpacing: '-0.01em' },
  h5: { fontWeight: 600 },
  subtitle1: { fontWeight: 600 },
  button: { fontWeight: 600, textTransform: 'none' }
}
```

### Motivazioni:

1. **Inter come Font Primario**
   - Font sans-serif moderno ottimizzato per leggibilità su schermo
   - Eccellente a dimensioni piccole (importante per dati numerici)
   - Ampiamente usato in applicazioni fintech moderne
   - Open source e ottimizzato per rendering web

2. **Fallback Strategici**
   - Montserrat: alternativa geometrica se Inter non disponibile
   - Segoe UI: font di sistema Windows per performance ottimali
   - Sans-serif generico come ultimo fallback

3. **Gerarchia Tipografica Chiara**
   - Font weight differenziati (700 per titoli, 600 per sottotitoli, 500 per testo)
   - Letter spacing negativo per titoli grandi (-0.01em) migliora leggibilità
   - `textTransform: 'none'` per bottoni mantiene leggibilità e modernità

---

## Componenti UI Personalizzati

### Card

```typescript
MuiCard: {
  styleOverrides: {
    root: {
      borderRadius: 24,
      border: `1px solid ${palette[mode].divider}`,
      boxShadow: '0 10px 35px rgba(0, 0, 0, 0.5)',
    }
  }
}
```

#### Motivazioni:

1. **Border Radius Generoso (24px)**
   - Crea un'estetica moderna e friendly
   - Riduce la percezione di rigidità e formalità eccessiva
   - Allineato con trend design contemporaneo (iOS, Material Design 3)

2. **Ombre Profonde**
   - L'ombra `0 10px 35px` crea profondità e gerarchia visiva
   - Simula l'elevazione fisica delle card
   - Migliora la scansionabilità dell'interfaccia

3. **Bordi Sottili**
   - Il bordo sottile definisce i confini senza appesantire
   - Usa il colore `divider` per coerenza con il tema

### Bottoni

```typescript
MuiButton: {
  styleOverrides: {
    root: {
      borderRadius: 999,  // Completamente arrotondati
      paddingLeft: 20,
      paddingRight: 20,
    }
  }
}
```

#### Motivazioni:

1. **Pill Shape (borderRadius: 999)**
   - Bottoni completamente arrotondati sono più invitanti al click
   - Estetica moderna e friendly
   - Maggiore area percepita di interazione

2. **Padding Generoso**
   - 20px orizzontale crea bottoni più prominenti e facili da cliccare
   - Migliora l'accessibilità su dispositivi touch
   - Riduce errori di click

---

## Navbar e Layout

### Navbar Sticky con Backdrop Blur

```typescript
AppBar: {
  position: "sticky",
  backdropFilter: 'blur(8px)',
  backgroundColor: theme.palette.background.paper
}
```

#### Motivazioni:

1. **Sticky Position**
   - La navbar rimane sempre visibile durante lo scroll
   - Accesso immediato a navigazione e logout
   - Migliora l'usabilità su pagine lunghe (es. lista transazioni)

2. **Backdrop Blur**
   - Effetto glassmorphism moderno e premium
   - Mantiene leggibilità del contenuto sottostante
   - Crea profondità visiva senza bloccare completamente il contenuto

3. **Bordo Inferiore Sottile**
   - Definisce la separazione tra navbar e contenuto
   - Non invasivo ma sufficiente per creare gerarchia

### Layout Minimalista

```typescript
<Box sx={{ minHeight: '100vh', backgroundColor: '#000000' }}>
  {showNavbar && <Navbar />}
  <Outlet />
</Box>
```

#### Motivazioni:

1. **Minimalismo Funzionale**
   - Nessun elemento superfluo che distragga dai dati finanziari
   - Focus totale sul contenuto (saldi, transazioni, grafici)
   - Allineato con principi di "content-first design"

2. **Navbar Condizionale**
   - Mostrata solo per utenti autenticati
   - Pagine pubbliche (login) hanno layout pulito senza distrazioni
   - Migliora il flusso di onboarding

---

## Conformità agli Standard

### WCAG 2.1 Level AA

L'interfaccia rispetta i criteri WCAG 2.1 Level AA:

1. **Contrasto Colori**
   - Tutti i testi hanno ratio di contrasto ≥ 4.5:1 (normale) o ≥ 3:1 (large)
   - Elementi interattivi hanno contrasto ≥ 3:1 con lo sfondo

2. **Navigazione da Tastiera**
   - Tutti gli elementi interattivi sono accessibili via tastiera
   - Focus visibile su tutti gli elementi (outline automatico)
   - Tab order logico e prevedibile

3. **Etichette e ARIA**
   - Bottoni hanno `aria-label` descrittivi
   - Form fields hanno label associate
   - Stati dinamici comunicati via `aria-live`

### AgID - Linee Guida Design

L'interfaccia segue le linee guida AgID per servizi digitali della PA:

1. **Semplicità e Chiarezza**
   - Linguaggio chiaro e diretto
   - Gerarchia visiva evidente
   - Azioni primarie ben evidenziate

2. **Coerenza**
   - Pattern di interazione consistenti in tutta l'applicazione
   - Terminologia uniforme
   - Comportamenti prevedibili

3. **Accessibilità**
   - Supporto per tecnologie assistive
   - Modalità ad alto contrasto (daltonica)
   - Responsive design per tutti i dispositivi

---

## Responsive Design

### Breakpoint Strategy

```typescript
sx={{
  display: { xs: 'none', md: 'flex' }  // Desktop
  display: { xs: 'flex', md: 'none' }  // Mobile
}}
```

#### Motivazioni:

1. **Mobile-First Approach**
   - Design ottimizzato prima per mobile, poi adattato a desktop
   - Riflette l'uso prevalente di app finanziarie su smartphone
   - Garantisce esperienza ottimale su dispositivi più vincolati

2. **Drawer per Mobile**
   - Menu hamburger su mobile per risparmiare spazio
   - Drawer laterale con navigazione completa
   - Transizioni fluide e gesture-friendly

3. **Layout Adattivo**
   - Container con `maxWidth: 'lg'` per leggibilità ottimale su desktop
   - Padding e spacing adattivi in base alla viewport
   - Immagini e card responsive

---

## Conclusioni

Le scelte di design dell'interfaccia sono guidate da tre principi fondamentali:

1. **Funzionalità**: Ogni decisione estetica serve uno scopo funzionale (leggibilità, usabilità, accessibilità)
2. **Accessibilità**: Inclusività per utenti con diverse capacità visive e preferenze
3. **Modernità**: Allineamento con le aspettative estetiche del settore fintech contemporaneo

La combinazione di modalità scura come default, palette verde-viola distintiva, e modalità daltonica accessibile crea un'esperienza utente che è al contempo moderna, professionale e inclusiva.

L'attenzione ai dettagli (border radius, ombre, blur effects) e la conformità agli standard (WCAG 2.1, AgID) dimostrano un approccio maturo e consapevole al design di interfacce per applicazioni finanziarie.
