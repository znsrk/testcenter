import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ResultsPage } from './ResultsPage'
import { TakeTestPage } from './TakeTestPage'

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 hover:text-[#007BFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

type TabKey = 'results' | 'takeTest'

export function HomePage() {
  const [isProfileOpen, setProfileOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('results')
  const profileRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuth()

  const userDetails = {
    name: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : 'User',
    email: user?.email || 'Unknown',
    id: user?.id || 'N/A',
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="flex min-h-screen bg-white text-gray-900 flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="mx-auto flex h-14 items-center justify-between px-4">
          <h1 className="text-xl font-bold text-[#007BFF]">EnglishProfTest</h1>
          <div className="relative" ref={profileRef}>
            <button onClick={() => setProfileOpen(!isProfileOpen)} aria-label="User Profile" className="flex items-center gap-2">
              <UserIcon />
            </button>
            <div
              className={`absolute right-0 mt-2 w-80 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 transition-all duration-200 ease-out ${
                isProfileOpen ? 'transform opacity-100 scale-100' : 'transform opacity-0 scale-95 pointer-events-none'
              }`}
              role="menu"
            >
              <div className="py-1" role="none">
                <div className="border-b border-gray-200 px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900">{userDetails.name}</p>
                  <p className="text-xs text-gray-500 break-all mt-1">{userDetails.email}</p>
                </div>
                <div className="px-4 py-3 text-sm text-gray-700 space-y-2">
                  <p><span className="font-semibold">ID:</span> {userDetails.id.slice(0, 8)}...</p>
                </div>
                <div className="border-t border-gray-200">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogoutIcon />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab navigation always visible on small screens, hidden on desktop */}
      <nav className="pt-14 bg-white border-b border-gray-200 w-full sticky top-0 z-30 sm:hidden">
        <div className="flex justify-center gap-2 mx-auto max-w-5xl">
          <button
            onClick={() => setActiveTab('results')}
            className={`flex-1 text-center px-4 py-3 rounded-t-lg border-b-2 transition font-semibold ${
              activeTab === 'results'
                ? 'border-[#007BFF] bg-[#EFF6FF] text-[#1D4ED8]'
                : 'border-transparent bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Results
          </button>
          <button
            onClick={() => setActiveTab('takeTest')}
            className={`flex-1 text-center px-4 py-3 rounded-t-lg border-b-2 transition font-semibold ${
              activeTab === 'takeTest'
                ? 'border-[#007BFF] bg-[#EFF6FF] text-[#1D4ED8]'
                : 'border-transparent bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Take Test
          </button>
        </div>
      </nav>

      {/* Main area */}
      <div className="flex w-full flex-1">
        {/* Sidebar only for desktop */}
        <nav className="hidden sm:block w-64 shrink-0 border-r border-gray-200 bg-white p-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setActiveTab('results')}
                className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                  activeTab === 'results'
                    ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                Results
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('takeTest')}
                className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                  activeTab === 'takeTest'
                    ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                Take Test
              </button>
            </li>
          </ul>
        </nav>

        {/* Right content panel */}
        <main className="flex-1 p-2 sm:p-6 pt-4 sm:pt-6">
          <div className="mx-auto max-w-5xl">
            {activeTab === 'results' && (
              <ResultsPage embedded />
            )}
            {activeTab === 'takeTest' && (
              <TakeTestPage />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}