import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider, useAuth } from './AuthContext'
import App from './App.jsx'
import Login from './Login.jsx'
import './App.css'

function Root() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="loading-spinner" /><div className="loading-text">Loading Team Rise...</div></div>
  return user ? <App /> : <Login />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>
)
