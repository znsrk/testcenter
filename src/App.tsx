import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { HomePage } from './components/HomePage'
import { LoginPage } from './components/LoginPage'
import { SignupPage } from './components/SignupPage'
import { GradeCalculator } from './components/calc'  // Assuming this component exists

function AppContent() {
  const [showSignup, setShowSignup] = useState(false)
  const { isAuthenticated } = useAuth()

  return (
    <div className="size-full">
      <Routes>
        <Route path="/" element={
          isAuthenticated ? (
            <HomePage />
          ) : (
            showSignup ? (
              <SignupPage onShowLogin={() => setShowSignup(false)} />
            ) : (
              <LoginPage onShowSignup={() => setShowSignup(true)} />
            )
          )
        } />
        <Route path="/calc" element={<GradeCalculator />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}