import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/useAppStore'
import { useSettingsStore } from './store/useSettingsStore'
import AuthPage from './pages/AuthPage'
import AppPage from './pages/AppPage'
import NotFoundPage from './pages/NotFoundPage'
import './index.css'

// Aplica preferências salvas antes do primeiro render (evita flash)
useSettingsStore.getState().apply()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAppStore(s => s.token)
  return token ? <>{children}</> : <Navigate to="/auth" replace />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/app" element={
          <ProtectedRoute>
            <AppPage />
          </ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
