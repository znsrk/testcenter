import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
// HomePage is no longer used in the render, but kept in imports if you need it later
// import { HomePage } from './components/HomePage' 
import { LoginPage } from './components/LoginPage'
import { SignupPage } from './components/SignupPage'
import { GradeCalculator } from './components/calc'
import TestsPage from './admin/TestsPage'
import TestPage from './pages/TestPage'
import GeneratedTestPage from './pages/test'
import OrderPage from './pages/OrderPage'

function AppContent() {
  const [showSignup, setShowSignup] = useState(false)
  const { isAuthenticated } = useAuth()

  return (
    <div className="size-full">
      <Routes>
        {/* NEW: The Order Page Route */}
        <Route path="/order" element={<OrderPage />} />
        
        <Route path="/" element={
          isAuthenticated ? (
            // If logged in, redirect immediately to /test
            <Navigate to="/test" replace />
          ) : (
            // If not logged in, show Login or Signup
            showSignup ? (
              <SignupPage onShowLogin={() => setShowSignup(false)} />
            ) : (
              <LoginPage onShowSignup={() => setShowSignup(true)} />
            )
          )
        } />
        
        <Route path="/calc" element={<GradeCalculator />} />
        <Route path="/admin" element={<TestsPage />} />
        
        {/* This is the destination for logged-in users */}
        <Route path="/test" element={<GeneratedTestPage />} />
        <Route path="/test/:id" element={<TestPage />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return <AppContent />
}