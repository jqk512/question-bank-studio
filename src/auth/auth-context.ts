import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export interface AuthState {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  signInWithPassword: (username: string, password: string) => Promise<void>
  signUpWithPassword: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)
