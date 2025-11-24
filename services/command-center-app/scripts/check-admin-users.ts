import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkAdminUsers() {
  console.log('Checking for admin users in the profiles table...\n')
  
  try {
    // First, let's check if the profiles table exists and what columns it has
    const { data: tableInfo, error: tableError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.error('Error accessing profiles table:', tableError)
      return
    }
    
    // Check for users with is_admin = true
    const { data: adminUsers, error: adminError } = await supabase
      .from('profiles')
      .select('id, email, display_name, is_admin, created_at')
      .eq('is_admin', true)
    
    if (adminError) {
      console.error('Error querying admin users:', adminError)
      return
    }
    
    if (!adminUsers || adminUsers.length === 0) {
      console.log('❌ No admin users found in the profiles table')
      console.log('\nTo make a user an admin, you need to update their profile:')
      console.log('UPDATE profiles SET is_admin = true WHERE id = \'USER_ID\';')
    } else {
      console.log(`✅ Found ${adminUsers.length} admin user(s):\n`)
      adminUsers.forEach((user, index) => {
        console.log(`${index + 1}. User ID: ${user.id}`)
        console.log(`   Email: ${user.email || 'Not set'}`)
        console.log(`   Display Name: ${user.display_name || 'Not set'}`)
        console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`)
        console.log(`   Is Admin: ${user.is_admin}`)
        console.log()
      })
    }
    
    // Also check for any regular users to see the total user count
    const { data: allUsers, error: allError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
    
    if (!allError && allUsers) {
      console.log(`\nTotal users in profiles table: ${allUsers.length}`)
    }
    
    // Check auth.users table to see if there are users not in profiles
    console.log('\n--- Checking for users in auth.users but not in profiles ---')
    console.log('(This requires service role key, so it might fail with anon key)')
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the check
checkAdminUsers().catch(console.error)