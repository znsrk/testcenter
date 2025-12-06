import { Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { HomePage } from './components/HomePage'
import { LoginPage } from './components/LoginPage'
import { SignupPage } from './components/SignupPage'
import { GradeCalculator } from './components/calc'
import TestsPage from './admin/TestsPage'
import TestPage from './pages/TestPage'
import GeneratedTestPage from './pages/test'

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
        <Route path="/admin" element={<TestsPage />} />
        <Route path="/test" element={<GeneratedTestPage />} />
        <Route path="/test/:id" element={<TestPage />} />
      </Routes>
    </div>
  )
}
export default function App() {
  return <AppContent />
}