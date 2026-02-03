'use client'

/**
 * Auth context: login, signup, logout, and current user/token state.
 * Token is stored in localStorage and in a cookie for middleware. On mount,
 * a stored token is verified via /api/auth/me; invalid tokens are cleared.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiRequest } from '@/lib/api'

interface User {
  id: string
  name: string
  email: string
  company?: string
  why_using_platform?: string
  created_at?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, company: string, whyUsingPlatform: string, email: string, password: string, confirmPassword: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for stored token on mount (from localStorage or cookie)
    const storedToken = localStorage.getItem('auth_token') || 
                       document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1]
    if (storedToken) {
      setToken(storedToken)
      // Verify token and get user
      verifyToken(storedToken)
    } else {
      setLoading(false)
    }
  }, [])

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await apiRequest<{ user: User }>('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${tokenToVerify}`,
        },
      })
      setUser(response.user)
      setToken(tokenToVerify)
    } catch (error) {
      // Token is invalid, remove it
      localStorage.removeItem('auth_token')
      document.cookie = 'auth_token=; path=/; max-age=0'
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await apiRequest<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    
    setUser(response.user)
    setToken(response.token)
    localStorage.setItem('auth_token', response.token)
    // Also set cookie for middleware
    document.cookie = `auth_token=${response.token}; path=/; max-age=${7 * 24 * 60 * 60}` // 7 days
  }

  const signup = async (name: string, company: string, whyUsingPlatform: string, email: string, password: string, confirmPassword: string) => {
    const response = await apiRequest<{ user: User; token: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, company, whyUsingPlatform, email, password, confirmPassword }),
    })
    
    setUser(response.user)
    setToken(response.token)
    localStorage.setItem('auth_token', response.token)
    // Also set cookie for middleware
    document.cookie = `auth_token=${response.token}; path=/; max-age=${7 * 24 * 60 * 60}` // 7 days
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('auth_token')
    // Remove cookie
    document.cookie = 'auth_token=; path=/; max-age=0'
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user && !!token,
      }}
    >
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
}

