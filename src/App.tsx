import { useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './auth/AuthProvider'
import { LibraryPage } from './pages/LibraryPage'
import { ImportPage } from './pages/ImportPage'
import { ReviewPage } from './pages/ReviewPage'
import { SearchPage } from './pages/SearchPage'
import { LoginPage } from './pages/LoginPage'
import { VisualEffects } from './components/VisualEffects'
import { loadSettings, saveSettings, type BackgroundSettings } from './lib/background-settings'
import './App.css'

function App() {
  const [bgSettings, setBgSettings] = useState<BackgroundSettings>(loadSettings)

  function updateBgSettings(changes: Partial<BackgroundSettings>) {
    setBgSettings((prev) => {
      const next = { ...prev, ...changes }
      saveSettings(next)
      return next
    })
  }

  return (
    <>
      <VisualEffects settings={bgSettings} />
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={
                <AppShell bgSettings={bgSettings} onBgChange={updateBgSettings} />
              }>
                <Route index element={<LibraryPage />} />
                <Route path="library/bank/:bankId" element={<LibraryPage />} />
                <Route path="library/group/:groupId" element={<LibraryPage />} />
                <Route path="import" element={<ImportPage />} />
                <Route path="review/:bankId" element={<ReviewPage />} />
              </Route>
            </Route>
            <Route path="bank/:slug" element={<SearchPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </>
  )
}

export default App
