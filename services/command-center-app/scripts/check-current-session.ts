import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: resolve(__dirname, '../.env') })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

async function checkSession() {
  console.log('🔍 Checking current session...\n')
  
  // Check session
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    console.error('❌ Error getting session:', error.message)
    return
  }
  
  if (!session) {
    console.log('❌ No active session found')
    console.log('   You need to log in first')
    return
  }
  
  console.log('✅ Active session found!')
  console.log(`   User ID: ${session.user.id}`)
  console.log(`   Email: ${session.user.email}`)
  console.log(`   Expires at: ${new Date(session.expires_at! * 1000).toLocaleString()}`)
  
  // Check admin status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, is_admin, display_name')
    .eq('id', session.user.id)
    .single()
  
  if (profileError) {
    console.error('\n❌ Error checking profile:', profileError.message)
    if (profileError.code === 'PGRST116') {
      console.log('   No profile found for this user')
      console.log('   This user needs a profile with is_admin = true')
    }
    return
  }
  
  console.log('\n📋 Profile found:')
  console.log(`   Display Name: ${profile.display_name || 'Not set'}`)
  console.log(`   Admin Status: ${profile.is_admin ? '✅ YES' : '❌ NO'}`)
  
  if (!profile.is_admin) {
    console.log('\n⚠️  This user is NOT an admin!')
    console.log('   The Command Center requires admin privileges')
    console.log('   Run this SQL to make the user an admin:')
    console.log(`
UPDATE profiles 
SET is_admin = true 
WHERE id = '${session.user.id}';
    `)
  }
}

checkSession().catch(console.error)