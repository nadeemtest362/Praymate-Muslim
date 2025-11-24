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

async function checkProfilesTable() {
  console.log('Checking profiles table structure and policies...\n')
  
  try {
    // Try to query the table to see what columns exist
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log('Error querying profiles table:', error)
      
      // Try to get more info about the table
      console.log('\nTrying to get table info through a different approach...')
      
      // Try inserting an empty row to see what columns are required
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({})
      
      if (insertError) {
        console.log('\nInsert error (this helps us understand the schema):')
        console.log(insertError)
      }
    } else {
      console.log('Sample profile data (to see columns):')
      console.log(JSON.stringify(data, null, 2))
    }
    
    // Now let's update the existing user to be an admin
    // We'll need to do this via the Supabase dashboard or with service role key
    console.log('\n========================================')
    console.log('MANUAL STEPS REQUIRED:')
    console.log('========================================')
    console.log('\n1. Go to your Supabase dashboard')
    console.log('2. Navigate to the SQL Editor')
    console.log('3. Run this query to make the user an admin:\n')
    console.log(`-- First, check if the user exists in auth.users
SELECT id, email FROM auth.users WHERE email = 'admin@justpray.app';

-- If the user exists, note the ID and run:
-- (Replace 'USER_ID_HERE' with the actual ID from the query above)
INSERT INTO profiles (id, email, is_admin, display_name, created_at, updated_at)
VALUES (
  'USER_ID_HERE',
  'admin@justpray.app',
  true,
  'Admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET is_admin = true,
    email = 'admin@justpray.app',
    updated_at = NOW();`)
    
    console.log('\n4. Or use this specific query with the known user ID:')
    console.log(`INSERT INTO profiles (id, email, is_admin, display_name, created_at, updated_at)
VALUES (
  '7defd8a7-eae8-4cd1-a54a-daa3db004a3a',
  'admin@justpray.app',
  true,
  'Admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET is_admin = true,
    email = 'admin@justpray.app',
    updated_at = NOW();`)
    
    console.log('\n========================================')
    console.log('After running the SQL query, you can login with:')
    console.log('Email: admin@justpray.app')
    console.log('Password: JustPrayAdmin2024!')
    console.log('========================================')
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the check
checkProfilesTable().catch(console.error)