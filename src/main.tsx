import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import './styles/fonts.css'
import './styles/global.css'
import { LocaleProvider } from './content/LocaleContext'
import { DEFAULT_LOCALE, isLocale } from './content/locales'
import { MotionProvider } from './motion/MotionContext'
import { Home } from './Home'
import { Privacy } from './pages/Privacy'

function LocaleShell() {
  const { locale } = useParams()
  if (!isLocale(locale)) return <Navigate to={`/${DEFAULT_LOCALE}`} replace />
  return (
    <LocaleProvider locale={locale}>
      <Outlet />
    </LocaleProvider>
  )
}

function ToLocaleRoot() {
  const { locale } = useParams()
  return <Navigate to={`/${isLocale(locale) ? locale : DEFAULT_LOCALE}`} replace />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MotionProvider>
        <Routes>
          <Route path="/" element={<Navigate to={`/${DEFAULT_LOCALE}`} replace />} />
          <Route path="/:locale" element={<LocaleShell />}>
            <Route index element={<Home />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="*" element={<ToLocaleRoot />} />
          </Route>
          <Route path="*" element={<Navigate to={`/${DEFAULT_LOCALE}`} replace />} />
        </Routes>
      </MotionProvider>
    </BrowserRouter>
  </StrictMode>,
)
