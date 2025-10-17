import { supabase } from './supabase'
import bcrypt from 'bcryptjs'

export interface User {
  id: string
  email: string
  created_at: string
}

export interface AuthError {
  message: string
}

export async function signUp(email: string, password: string): Promise<{ user?: User; error?: AuthError }> {
  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    
    const { data, error } = await supabase
      .from('users')
      .insert([{ email, password_hash: hashedPassword }])
      .select()
      .single()

    if (error) {
      return { error: { message: error.message } }
    }

    return { user: data }
  } catch (err) {
    return { error: { message: 'Failed to create account' } }
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

    localStorage.setItem('userId', data.id)
    return { user: data }
  } catch (err) {
    return { error: { message: 'Login failed' } }
  }
}

export function logout(): void {
  localStorage.removeItem('userId')
}

export function getCurrentUser(): string | null {
  return localStorage.getItem('userId')
}