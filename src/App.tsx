import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { HomePage } from './components/HomePage'
import { RegistrationPage } from './components/RegistrationPage'
import { SuccessPage } from './components/SuccessPage'
import { ResultsPage } from './components/ResultsPage'
import { InfoPage } from './components/InfoPage'
import { SchedulePage } from './components/SchedulePage'
import { LoginPage } from './components/LoginPage'
import { SignupPage } from './components/SignupPage'

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home')
  const { isAuthenticated } = useAuth()

  const handleNavigate = (page: string) => {
    setCurrentPage(page)
  }

  // If not authenticated, only show login/signup
  if (!isAuthenticated) {
    return (
      <div className="size-full">
        {currentPage === 'signup' ? (
          <SignupPage onNavigate={handleNavigate} />
        ) : (
          <LoginPage onNavigate={handleNavigate} />
        )}
      </div>
    )
  }

  // If authenticated, show all pages
  return (
    <div className="size-full">
      {currentPage === 'home' && <HomePage onNavigate={handleNavigate} />}
      {currentPage === 'registration' && <RegistrationPage onNavigate={handleNavigate} />}
      {currentPage === 'success' && <SuccessPage onNavigate={handleNavigate} />}
      {currentPage === 'results' && <ResultsPage onNavigate={handleNavigate} />}
      {currentPage === 'info' && <InfoPage onNavigate={handleNavigate} />}
      {currentPage === 'schedule' && <SchedulePage onNavigate={handleNavigate} />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}