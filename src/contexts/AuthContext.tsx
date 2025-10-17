interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  iin?: string
<<<<<<< HEAD
}

interface AuthContextType {
  user: User | null
  login: (user: User) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Check if user is already logged in on mount
    const currentUser = getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
    }
  }, [])

  const login = (userData: User) => {
    setUser(userData)
  }

  const logout = () => {
    authLogout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
=======
>>>>>>> f66adcd9abe11b63ac2998977bfa01c9b0624abb
}