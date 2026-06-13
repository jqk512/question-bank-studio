import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './auth/AuthProvider'
import { LibraryPage } from './pages/LibraryPage'
import { ImportPage } from './pages/ImportPage'
import { ReviewPage } from './pages/ReviewPage'
import { SearchPage } from './pages/SearchPage'
import { LoginPage } from './pages/LoginPage'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
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
  )
}

export default App
