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

async function fixUserProfile() {
  const userId = 'bbba0569-5311-4560-b5e5-403c9e0916ac'
  const email = 'milesdysonlocal@gmail.com'
  
  console.log('🔍 Checking profile for user:', email)
  
  // Check if profile exists by ID
  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('❌ Error checking profile:', fetchError)
    return
  }
  
  if (existingProfile) {
    console.log('✅ Profile already exists:')
    console.log('   - ID:', existingProfile.id)
    console.log('   - Email:', existingProfile.email)
    console.log('   - Admin:', existingProfile.is_admin ? '✅ YES' : '❌ NO')
    
    if (!existingProfile.is_admin) {
      console.log('\n🔧 Updating profile to admin...')
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', userId)
      
      if (updateError) {
        console.error('❌ Failed to update:', updateError)
      } else {
        console.log('✅ Profile updated to admin!')
      }
    }
  } else {
    console.log('❌ No profile found, creating one...')
    
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        is_admin: true,
        display_name: 'Miles Dyson',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Failed to create profile:', insertError)
      console.log('\n⚠️  Run this SQL in Supabase Dashboard:')
      console.log(`
INSERT INTO profiles (id, email, is_admin, display_name, created_at, updated_at)
VALUES (
  '${userId}',
  '${email}',
  true,
  'Miles Dyson',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET is_admin = true, email = '${email}', updated_at = NOW();
      `)
    } else {
      console.log('✅ Admin profile created successfully!')
      console.log('   You should now be able to access the Command Center')
    }
  }
}

fixUserProfile().catch(console.error)