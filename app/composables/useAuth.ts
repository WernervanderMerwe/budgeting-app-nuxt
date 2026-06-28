interface AuthUser {
  id: string
  email: string
  name?: string | null
  image?: string | null
}

/**
 * Authentication composable wrapping better-auth (magic-link only).
 * Session state is cached in useState so components share it.
 */
export const useAuth = () => {
  const { $authClient } = useNuxtApp() as unknown as {
    $authClient?: {
      signIn: { magicLink: (opts: { email: string; callbackURL?: string }) => Promise<{ error?: { message?: string } | null }> }
      signOut: () => Promise<unknown>
      getSession: () => Promise<{ data?: { user?: AuthUser } | null }>
    }
  }

  const user = useState<AuthUser | null>('auth-user', () => null)
  const isAuthenticated = computed(() => !!user.value)

  // Send a magic-link sign-in email. First sign-in also creates the account.
  const sendMagicLink = async (email: string) => {
    if (!$authClient) throw new Error('Auth client unavailable')
    const { error } = await $authClient.signIn.magicLink({ email, callbackURL: '/' })
    if (error) throw new Error(error.message || 'Failed to send magic link')
  }

  // Refresh the cached session from the server.
  const fetchSession = async () => {
    if (!$authClient) return null
    const { data } = await $authClient.getSession()
    user.value = data?.user ?? null
    return user.value
  }

  const signOut = async () => {
    if ($authClient) await $authClient.signOut()
    user.value = null
    await navigateTo('/login')
  }

  return { user, isAuthenticated, sendMagicLink, fetchSession, signOut }
}
