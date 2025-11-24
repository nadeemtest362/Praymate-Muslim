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

async function checkUser(email: string) {
  console.log(`🔍 Checking user: ${email}\n`)
  
  // First, get all profiles to see what we have
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
  
  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError)
    return
  }
  
  if (!profiles || profiles.length === 0) {
    console.log('❌ No profile found for this email')
    console.log('   User needs a profile in the profiles table')
    return
  }
  
  console.log(`✅ Found ${profiles.length} profile(s):`)
  profiles.forEach((profile, i) => {
    console.log(`\n   Profile ${i + 1}:`)
    console.log(`   - ID: ${profile.id}`)
    console.log(`   - Email: ${profile.email}`)
    console.log(`   - Admin: ${profile.is_admin ? '✅ YES' : '❌ NO'}`)
    console.log(`   - Display Name: ${profile.display_name || 'Not set'}`)
    console.log(`   - Created: ${new Date(profile.created_at).toLocaleString()}`)
  })
  
  // Check if any are admin
  const adminProfiles = profiles.filter(p => p.is_admin)
  if (adminProfiles.length === 0) {
    console.log('\n⚠️  No admin profiles found for this email!')
    console.log('   Run this SQL to make the user an admin:')
    console.log(`
UPDATE profiles 
SET is_admin = true 
WHERE email = '${email}';
    `)
  }
}

// Check if email was provided as argument
const email = process.argv[2]
if (!email) {
  console.error('❌ Please provide an email address')
  console.log('   Usage: pnpm tsx scripts/check-specific-user.ts your@email.com')
  process.exit(1)
}

checkUser(email).catch(console.error)