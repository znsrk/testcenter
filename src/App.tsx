import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { HomePage } from './components/HomePage'
import { LoginPage } from './components/LoginPage'
import { SignupPage } from './components/SignupPage'

function AppContent() {
  const [showSignup, setShowSignup] = useState(false)
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <div className="size-full">
        {showSignup ? (
          <SignupPage onShowLogin={() => setShowSignup(false)} />
        ) : (
          <LoginPage onShowSignup={() => setShowSignup(true)} />
        )}
      </div>
    )
  }

  return (
    <div className="size-full">
      <HomePage />
    </div>
  )
}

export default function App() {
  return <AppContent />
}