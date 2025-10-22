import { supabase } from './supabase'
import bcrypt from 'bcryptjs'

export interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  created_at: string
}

export interface AuthError {
  message: string
}

export interface SignUpData {
  email: string
  password: string
  firstName: string
  lastName: string
}

export async function signUp(data: SignUpData): Promise<{ user?: User; error?: AuthError }> {
  try {
    const hashedPassword = await bcrypt.hash(data.password, 10)
    
    const { data: userData, error } = await supabase
      .from('users')
      .insert([{
        email: data.email,
        password_hash: hashedPassword,
        first_name: data.firstName,
        last_name: data.lastName
      }])
      .select()
      .single()

    if (error) {
      return { error: { message: error.message } }
    }

    return { user: userData }
  } catch (err: any) {
    return { error: { message: err.message || 'Failed to create account' } }
  }
}

export async function login(email: string, password: string): Promise<{ user?: User; error?: AuthError }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) {
      return { error: { message: 'Invalid email or password' } }
    }

    const isValid = await bcrypt.compare(password, data.password_hash)

    if (!isValid) {
      return { error: { message: 'Invalid email or password' } }
    }

    // Store user data in localStorage
    localStorage.setItem('userId', data.id)
    localStorage.setItem('userEmail', data.email)
    if (data.first_name) localStorage.setItem('userFirstName', data.first_name)
    if (data.last_name) localStorage.setItem('userLastName', data.last_name)
    
    return { user: data }
  } catch (err: any) {
    return { error: { message: err.message || 'Login failed' } }
  }
}

export function logout(): void {
  localStorage.removeItem('userId')
  localStorage.removeItem('userEmail')
  localStorage.removeItem('userFirstName')
  localStorage.removeItem('userLastName')
}

export function getCurrentUser(): User | null {
  const userId = localStorage.getItem('userId')
  const userEmail = localStorage.getItem('userEmail')
  const firstName = localStorage.getItem('userFirstName')
  const lastName = localStorage.getItem('userLastName')
  
  if (userId && userEmail) {
    return {
      id: userId,
      email: userEmail,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      created_at: ''
    }
  }
  
  return null
}