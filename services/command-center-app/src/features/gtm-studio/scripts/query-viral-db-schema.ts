import { createClient } from '@supabase/supabase-js'

// Viral database configuration
const VIRAL_SUPABASE_URL = 'https://molydcrzwsoeyqkiofwe.supabase.co'
const VIRAL_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vbHlkY3J6d3NvZXlxa2lvZndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTUxMDQxMjAsImV4cCI6MjAzMDY4MDEyMH0.D2PkLzsayA6J2d4BoHmSj5CcBWqMXpQHehfbCJJKvWY'

const viralDb = createClient(VIRAL_SUPABASE_URL, VIRAL_SUPABASE_ANON_KEY)

async function queryViralSchema() {
  console.log('🔍 Querying Viral Database Schema...\n')
  console.log(`Database: ${VIRAL_SUPABASE_URL}\n`)

  // List of potential tables to check
  const potentialTables = [
    // Video related
    'videos',
    'ai_analyses',
    'viral_insights_summary',
    'viral_insights_techniques',
    'viral_insights_triggers',
    'viral_insights_visual_elements',
    'viral_insights_top_hooks',
    'viral_insights_concept_themes',
    // GTM related
    'gtm_projects',
    'gtm_phases',
    'gtm_tasks',
    'gtm_risks',
    'gtm_media_assets',
    // Production
    'production_sessions',
    'production_session_assets',
    // Workflows
    'workflows',
    'workflow_runs',
    'workflow_run_logs',
    // TikTok Portfolio (to be created)
    'tiktok_accounts',
    'content_assignments',
    'content_strategies',
  ]

  const existingTables: string[] = []
  const tableSchemas: Record<string, any> = {}

  // Check each potential table
  for (const tableName of potentialTables) {
    try {
      const { data, error, count } = await viralDb
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (!error) {
        existingTables.push(tableName)
        console.log(`✅ Table exists: ${tableName} (${count} rows)`)

        // Get sample data to infer schema
        const { data: sample } = await viralDb
          .from(tableName)
          .select('*')
          .limit(1)

        if (sample && sample.length > 0) {
          const columns = Object.keys(sample[0])
          tableSchemas[tableName] = columns
          console.log(`   Columns: ${columns.join(', ')}\n`)
        }
      }
    } catch (e) {
      // Table doesn't exist, skip
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('\n📊 SUMMARY')
  console.log(`Found ${existingTables.length} tables:`)
  existingTables.forEach((table) => console.log(`  - ${table}`))

  console.log('\n\n📋 DETAILED SCHEMA:')

  // Get detailed schema for existing tables
  for (const table of existingTables) {
    console.log(`\n${table}:`)
    const { data: sample } = await viralDb.from(table).select('*').limit(1)

    if (sample && sample.length > 0) {
      Object.entries(sample[0]).forEach(([key, value]) => {
        const type =
          value === null
            ? 'null'
            : Array.isArray(value)
              ? 'array'
              : typeof value
        console.log(`  ${key}: ${type}`)
      })
    }
  }

  // Check for TikTok portfolio tables specifically
  console.log('\n\n🎯 TikTok Portfolio Tables Status:')
  const portfolioTables = [
    'tiktok_accounts',
    'content_assignments',
    'content_strategies',
  ]
  for (const table of portfolioTables) {
    if (existingTables.includes(table)) {
      console.log(`  ✅ ${table} exists`)
    } else {
      console.log(`  ❌ ${table} MISSING - needs to be created`)
    }
  }

  return { existingTables, tableSchemas }
}

// Run the query
queryViralSchema()
  .then(() => {
    console.log('\n✅ Schema query complete!')
  })
  .catch((error) => {
    console.error('❌ Error:', error)
  })
