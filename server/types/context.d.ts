import type { User } from '@supabase/supabase-js'

declare module 'h3' {
  interface H3EventContext {
    profileToken: string
    user: User
  }
}

export {}
