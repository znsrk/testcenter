export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  return localApi(path, options) as Promise<T>
}
export const post = <T>(path: string, body: unknown = {}) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) })
export const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.'
export const time = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')}`
export const date = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
export function readLocal<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') as T | null
  } catch {
    return null
  }
}
export function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
import { localApi } from './localApi'
