import type { Provider } from '@supabase/supabase-js'

/**
 * Authentication composable wrapping Supabase Auth
 */
export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const isAuthenticated = computed(() => !!user.value)

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  const signInWithOAuth = async (provider: Provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/confirm`,
      },
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw new Error(error.message)
    }

    // Redirect to home after sign out
    await navigateTo('/')
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      throw new Error(error.message)
    }
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      throw new Error(error.message)
    }
  }

  return {
    user,
    isAuthenticated,
    signIn,
    signInWithOAuth,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  }
}
