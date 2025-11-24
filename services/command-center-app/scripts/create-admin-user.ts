#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!

if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL is not set in .env')
  process.exit(1)
}

console.log('🔧 Setting up admin user for Command Center...\n')

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createAdminUser() {
  const email = 'admin@justpray.app'
  const password = 'JustPrayAdmin2024!'
  
  console.log(`📧 Creating admin user: ${email}`)
  
  try {
    // First, check if user already exists
    const { data: existingAuth } = await supabase.auth.admin.listUsers()
    const existingUser = existingAuth?.users?.find(u => u.email === email)
    
    let userId: string
    
    if (existingUser) {
      console.log('✅ Auth user already exists')
      userId = existingUser.id
    } else {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      
      if (authError) {
        console.error('❌ Failed to create auth user:', authError.message)
        return
      }
      
      userId = authData.user!.id
      console.log('✅ Auth user created successfully')
    }
    
    // Create or update profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        is_admin: true,
        display_name: 'Admin',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
    
    if (profileError) {
      console.error('❌ Failed to create admin profile:', profileError.message)
      console.log('\n⚠️  You may need to run the following SQL in Supabase Dashboard:')
      console.log(`
INSERT INTO profiles (id, email, is_admin, display_name, created_at, updated_at)
VALUES (
  '${userId}',
  '${email}',
  true,
  'Admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET is_admin = true, email = '${email}', updated_at = NOW();
      `)
      return
    }
    
    console.log('✅ Admin profile created/updated successfully')
    console.log('\n🎉 Setup complete! You can now log in with:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    console.log('\n⚠️  Please change the password after your first login!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the setup
createAdminUser().then(() => {
  console.log('\n✨ Done!')
  process.exit(0)
}).catch(error => {
  console.error('❌ Setup failed:', error)
  process.exit(1)
})