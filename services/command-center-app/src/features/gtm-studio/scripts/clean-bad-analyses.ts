// Script to clean up bad analysis data from failed runs
import { dirname, resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: resolve(__dirname, '../../../../.env') })

// Use environment variables directly for Node context
const supabaseUrl = process.env.VITE_VIRAL_SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_VIRAL_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function cleanBadAnalyses() {
  console.log('🧹 Cleaning up bad analysis data...\n')

  // First, let's see what we have
  const { data: analyses, error: fetchError } = await supabase
    .from('ai_analyses')
    .select(
      'id, video_id, video_id_internal, analysis_type, content, source_of_analysis_input, analyzed_at'
    )
    .order('analyzed_at', { ascending: false })
    .limit(100)

  if (fetchError) {
    console.error('Error fetching analyses:', fetchError)
    return
  }

  console.log(`Found ${analyses?.length || 0} recent analyses\n`)

  // Identify bad analyses
  const badAnalyses: number[] = []

  analyses?.forEach((analysis) => {
    let isBad = false
    let reason = ''

    // Check for empty or malformed content
    if (!analysis.content) {
      isBad = true
      reason = 'Empty content'
    } else if (typeof analysis.content === 'string') {
      // Content should be JSON object, not string
      isBad = true
      reason = 'Content is string instead of object'
    } else if (
      !analysis.content.overall_summary &&
      !analysis.content.new_video_concepts
    ) {
      // Missing required fields
      isBad = true
      reason = 'Missing required fields'
    } else if (analysis.content.error) {
      // Contains error field
      isBad = true
      reason = `Error: ${analysis.content.error}`
    }

    if (isBad) {
      badAnalyses.push(analysis.id)
      console.log(`❌ Bad analysis ID ${analysis.id}: ${reason}`)
      console.log(
        `   Video: ${analysis.video_id}, Type: ${analysis.analysis_type}`
      )
      console.log(
        `   Date: ${new Date(analysis.analyzed_at).toLocaleString()}\n`
      )
    }
  })

  if (badAnalyses.length === 0) {
    console.log('✅ No bad analyses found!')
    return
  }

  // Ask for confirmation
  console.log(`\n⚠️  Found ${badAnalyses.length} bad analyses to delete.`)
  console.log('These IDs will be deleted:', badAnalyses.join(', '))

  // For safety, let's not auto-delete in this script
  console.log('\nTo delete these analyses, run:')
  console.log(`
const { error } = await supabase
  .from('ai_analyses')
  .delete()
  .in('id', [${badAnalyses.join(', ')}])
`)

  // Also check for duplicate analyses
  console.log('\n🔍 Checking for duplicate analyses...')

  const videoGroups = new Map<string, any[]>()
  analyses?.forEach((analysis) => {
    const key = `${analysis.video_id}_${analysis.analysis_type}`
    if (!videoGroups.has(key)) {
      videoGroups.set(key, [])
    }
    videoGroups.get(key)?.push(analysis)
  })

  let duplicateCount = 0
  videoGroups.forEach((group, key) => {
    if (group.length > 1) {
      duplicateCount++
      console.log(`\n⚠️  Duplicate analyses for ${key}:`)
      group.forEach((a) => {
        console.log(
          `   ID: ${a.id}, Date: ${new Date(a.analyzed_at).toLocaleString()}`
        )
      })
    }
  })

  if (duplicateCount > 0) {
    console.log(`\n📊 Found ${duplicateCount} videos with duplicate analyses`)
  } else {
    console.log('\n✅ No duplicate analyses found')
  }
}

// Run the cleanup check
cleanBadAnalyses().catch(console.error)
