import { supabase } from '../services/supabase-service'

async function createTikTokPortfolioTables() {
  console.log('🚀 Creating TikTok portfolio tables in toktrendz database...')
  console.log('\n📝 Instructions to run the migration:')
  console.log(
    '1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new'
  )
  console.log('2. Replace YOUR_PROJECT_ID with your actual project ID')
  console.log(
    '3. Copy and paste the SQL from: /supabase/migrations/create_tiktok_portfolio_tables.sql'
  )
  console.log('4. Click "Run" to execute the migration')
  console.log('\nAlternatively, you can use the Supabase CLI:')
  console.log('supabase db push --db-url "YOUR_DATABASE_URL"')

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
    } else if (assetsError.code === '42703') {
      console.log(
        '❌ production_session_assets.assignment_status column does not exist - migration needed'
      )
    } else if (assetsError.code === '42P01') {
      console.log(
        '❌ production_session_assets table does not exist - migration needed'
      )
    }

    console.log('\n📌 Migration file location:')
    console.log(
      '/Users/milesdyson/secretlab/personal-prayers/services/command-center-app/supabase/migrations/create_tiktok_portfolio_tables.sql'
    )
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the check
createTikTokPortfolioTables()
