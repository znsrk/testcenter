import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { HomePage } from './components/HomePage'
import { RegistrationPage } from './components/RegistrationPage'
import { SuccessPage } from './components/SuccessPage'
import { ResultsPage } from './components/ResultsPage'
import { LoginPage } from './components/LoginPage'
import { SignupPage } from './components/SignupPage'

type Page =
  | 'home'
  | 'home-takeTest'
  | 'registration'
  | 'success'
  | 'results'
  | 'login'
  | 'signup'

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const { isAuthenticated } = useAuth()

  const handleNavigate = (page: Page) => {
    setCurrentPage(page)
  }

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

  return (
    <div className="size-full">
      {currentPage === 'home' && <HomePage onNavigate={handleNavigate} />}
      {currentPage === 'home-takeTest' && <HomePage onNavigate={handleNavigate} initialTab="takeTest" />}
      {currentPage === 'registration' && <RegistrationPage onNavigate={handleNavigate} />}
      {currentPage === 'success' && <SuccessPage onNavigate={handleNavigate} />}
      {currentPage === 'results' && <ResultsPage onNavigate={handleNavigate} />}
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