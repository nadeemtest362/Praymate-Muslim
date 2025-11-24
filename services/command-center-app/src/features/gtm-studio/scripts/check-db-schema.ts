import { supabase } from '../services/supabase-service'

export async function checkDatabaseSchema() {
  console.log('🔍 Checking toktrendz database schema...\n')
  console.log(`Database URL: ${import.meta.env.VITE_VIRAL_SUPABASE_URL}\n`)

  try {
    // Comprehensive list of all potential tables
    const allPotentialTables = [
      // Video related
      'videos',
      'viral_videos',
      'viral_video_analyses',
      'video_analyses',
      'ai_analyses',
      'tiktok_videos',
      'video_analysis',
      'analyses',
      // Viral insights
      'viral_insights_summary',
      'viral_techniques',
      'emotional_triggers',
      'visual_elements',
      'top_hooks',
      'concept_themes',
      // GTM related
      'gtm_projects',
      'gtm_phases',
      'gtm_tasks',
      'gtm_risks',
      'gtm_media_assets',
      'gtm_workflows',
      // Production
      'production_sessions',
      // Workflows
      'workflows',
      'workflow_steps',
      'workflow_executions',
      'workflow_step_executions',
      // Others
      'onboarding_flows',
      'onboarding_flow_steps',
      'prayer_lab_conversations',
      'prayer_lab_messages',
    ]

    console.log('📊 Checking all potential tables in toktrendz database:\n')
    console.log('─'.repeat(80))

    const existingTables: string[] = []

    for (const tableName of allPotentialTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        if (!error) {
          existingTables.push(tableName)
          console.log(`\n✅ Table: ${tableName}`)
          console.log(`   Rows: ${count}`)

          // Get detailed column info
          const { data: sample } = await supabase
            .from(tableName)
            .select('*')
            .limit(1)

          if (sample && sample.length > 0) {
            console.log(`   Columns:`)
            Object.entries(sample[0]).forEach(([key, value]) => {
              const type =
                value === null
                  ? 'null'
                  : Array.isArray(value)
                    ? 'array'
                    : typeof value
              console.log(`     - ${key}: ${type}`)
            })
          }
        }
      } catch (e) {
        // Table doesn't exist, skip
      }
    }

    console.log('\n' + '─'.repeat(80))
    console.log(
      `\n📋 Summary: Found ${existingTables.length} tables in toktrendz database:`
    )
    existingTables.forEach((table) => console.log(`   • ${table}`))

    // Show detailed data for key tables
    console.log('\n\n🔍 Detailed inspection of key tables:')
    console.log('─'.repeat(80))

    // Check videos table
    if (existingTables.includes('videos')) {
      console.log('\n📹 Videos Table:')
      const { data: videos } = await supabase
        .from('videos')
        .select('*')
        .limit(2)

      if (videos && videos.length > 0) {
        console.log('Sample video:')
        console.log(JSON.stringify(videos[0], null, 2))
      }
    }

    // Check ai_analyses table
    if (existingTables.includes('ai_analyses')) {
      console.log('\n🤖 AI Analyses Table:')
      const { data: analyses } = await supabase
        .from('ai_analyses')
        .select('*')
        .limit(1)

      if (analyses && analyses.length > 0) {
        console.log('Sample analysis:')
        console.log(JSON.stringify(analyses[0], null, 2))
      }
    }
  } catch (error) {
    console.error('Error checking schema:', error)
  }
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  ;(window as any).checkDatabaseSchema = checkDatabaseSchema
}
