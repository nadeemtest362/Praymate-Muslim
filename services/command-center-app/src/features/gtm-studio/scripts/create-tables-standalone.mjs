import { dirname, join } from 'path'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../../../../.env') })
dotenv.config({ path: join(__dirname, '../../../../.env.local') })

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_VIRAL_SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_VIRAL_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in environment variables')
  console.log(
    'Expected variables: VITE_VIRAL_SUPABASE_URL, VITE_VIRAL_SUPABASE_ANON_KEY'
  )
  process.exit(1)
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
})

async function createTikTokPortfolioTables() {
  console.log('🚀 Creating TikTok portfolio tables in toktrendz database...')
  console.log('📍 Database URL:', supabaseUrl)

  try {
    // First, let's verify we can connect to the database
    console.log('\n🔍 Testing database connection...')

    // Try to query an existing table to verify connection
    const { data: testData, error: testError } = await supabase
      .from('videos')
      .select('id')
      .limit(1)

    if (testError) {
      console.error('❌ Cannot connect to database:', testError)
      return
    }

    console.log('✅ Database connection successful')

    // Now let's check if the tables already exist
    console.log('\n📋 Checking for existing tables...')

    // Check tiktok_accounts table
    const { error: accountsError } = await supabase
      .from('tiktok_accounts')
      .select('id')
      .limit(1)

    if (!accountsError || accountsError.code !== '42P01') {
      console.log('✅ tiktok_accounts table already exists')
    } else {
      console.log('❌ tiktok_accounts table does not exist - migration needed')
    }

    // Check content_assignments table
    const { error: assignmentsError } = await supabase
      .from('content_assignments')
      .select('id')
      .limit(1)

    if (!assignmentsError || assignmentsError.code !== '42P01') {
      console.log('✅ content_assignments table already exists')
    } else {
      console.log(
        '❌ content_assignments table does not exist - migration needed'
      )
    }

    // Check production_session_assets column
    const { error: assetsError } = await supabase
      .from('production_session_assets')
      .select('id, assignment_status')
      .limit(1)

    if (!assetsError) {
      console.log(
        '✅ production_session_assets.assignment_status column already exists'
      )
    } else if (
      assetsError.message?.includes('column "assignment_status" does not exist')
    ) {
      console.log(
        '❌ production_session_assets.assignment_status column does not exist - migration needed'
      )
    } else if (assetsError.code === '42P01') {
      console.log(
        '❌ production_session_assets table does not exist - migration needed'
      )
    }

    console.log('\n📌 Migration instructions:')
    console.log('1. Go to your Supabase Dashboard SQL Editor')
    console.log('2. Copy and paste the SQL from:')
    console.log(
      '   /Users/milesdyson/secretlab/personal-prayers/services/command-center-app/supabase/migrations/create_tiktok_portfolio_tables.sql'
    )
    console.log('3. Click "Run" to execute the migration')

    console.log('\n📊 Summary:')
    console.log('- The migration SQL file has been created')
    console.log('- You need to run it manually in the Supabase Dashboard')
    console.log(
      '- This will create the tiktok_accounts and content_assignments tables'
    )
    console.log(
      '- It will also add the assignment_status column to production_session_assets'
    )
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the check
createTikTokPortfolioTables()
