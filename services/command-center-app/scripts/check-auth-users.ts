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

async function createAdminUser() {
  console.log('Creating an admin user for Command Center...\n')
  
  const email = 'admin@justpray.app'
  const password = 'JustPrayAdmin2024!' // You should change this immediately after first login
  
  try {
    // First, try to sign up a new user
    console.log('1. Creating auth user...')
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: 'Admin',
        }
      }
    })
    
    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        console.log('   User already exists in auth.users, attempting to sign in...')
        
        // Try to sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        
        if (signInError) {
          console.error('   Error signing in:', signInError.message)
          console.log('\n   The user exists but the password might be different.')
          console.log('   You may need to reset the password or use the correct password.')
          return
        }
        
        if (signInData.user) {
          console.log(`   ✅ Signed in successfully. User ID: ${signInData.user.id}`)
          await updateProfileToAdmin(signInData.user.id, email)
        }
      } else {
        console.error('   Error creating user:', signUpError.message)
        return
      }
    } else if (signUpData.user) {
      console.log(`   ✅ User created successfully. User ID: ${signUpData.user.id}`)
      await updateProfileToAdmin(signUpData.user.id, email)
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

async function updateProfileToAdmin(userId: string, email: string) {
  console.log('\n2. Updating profile to admin...')
  
  // First, check if profile exists
  const { data: existingProfile, error: checkError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (checkError && checkError.code !== 'PGRST116') {
    console.error('   Error checking profile:', checkError)
    return
  }
  
  if (existingProfile) {
    // Update existing profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_admin: true, email })
      .eq('id', userId)
    
    if (updateError) {
      console.error('   Error updating profile:', updateError)
    } else {
      console.log('   ✅ Profile updated to admin successfully!')
    }
  } else {
    // Insert new profile
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        is_admin: true,
        display_name: 'Admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (insertError) {
      console.error('   Error creating profile:', insertError)
      console.log('\n   Note: The profiles table might have different columns.')
      console.log('   You may need to check the table schema and adjust the insert.')
    } else {
      console.log('   ✅ Admin profile created successfully!')
    }
  }
  
  console.log('\n========================================')
  console.log('Admin user setup complete!')
  console.log('Email:', email)
  console.log('Password:', 'JustPrayAdmin2024!')
  console.log('========================================')
  console.log('\n⚠️  IMPORTANT: Change this password immediately after first login!')
}

// Run the setup
createAdminUser().catch(console.error)