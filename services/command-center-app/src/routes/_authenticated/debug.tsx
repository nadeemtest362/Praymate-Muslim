import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_authenticated/debug')({
  component: DebugAuth,
})

function DebugAuth() {
  const auth = useAuth()
  
  const checkAuth = async () => {
    console.log('=== AUTH DEBUG ===')
    console.log('Auth state:', {
      isAuthenticated: auth.isAuthenticated,
      isAdmin: auth.isAdmin,
      user: auth.user,
      session: auth.session,
    })
    
    // Check localStorage
    const localStorageKeys = Object.keys(localStorage).filter(k => 
      k.includes('auth') || k.includes('supabase') || k.includes('sb-')
    )
    console.log('Auth-related localStorage keys:', localStorageKeys)
    
    localStorageKeys.forEach(key => {
      console.log(`${key}:`, localStorage.getItem(key))
    })
    
    // Check Supabase session
    const { data: { session }, error } = await supabase.auth.getSession()
    console.log('Supabase session:', session)
    console.log('Session error:', error)
    
    // Check user
    const { data: { user } } = await supabase.auth.getUser()
    console.log('Supabase user:', user)
  }
  
  const forceRefresh = async () => {
    const { data, error } = await supabase.auth.refreshSession()
    console.log('Refresh result:', data)
    console.log('Refresh error:', error)
    window.location.reload()
  }
  
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Auth Debug Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p>Is Authenticated: {auth.isAuthenticated ? '✅' : '❌'}</p>
            <p>Is Admin: {auth.isAdmin ? '✅' : '❌'}</p>
            <p>User Email: {auth.user?.email || 'None'}</p>
            <p>Session Expires: {auth.session?.expires_at ? new Date(auth.session.expires_at * 1000).toLocaleString() : 'No session'}</p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={checkAuth}>Check Auth (Console)</Button>
            <Button onClick={forceRefresh} variant="outline">Force Refresh Session</Button>
            <Button onClick={() => auth.initialize()} variant="outline">Re-initialize Auth</Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Open browser console to see detailed debug info
          </div>
        </CardContent>
      </Card>
    </div>
  )
}