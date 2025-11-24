import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = 'https://molydcrzwsoeyqkiofwe.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_VIRAL_SUPABASE_ANON_KEY || ''

if (!supabaseAnonKey) {
  console.error('❌ Missing VITE_VIRAL_SUPABASE_ANON_KEY in environment')
  throw new Error('Supabase credentials not configured')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function applyViralSchema() {
  console.log('🔄 Applying viral video analysis schema...')

  try {
    // Read the migration SQL
    const migrationSQL = `
-- Drop old tables if they exist
DROP TABLE IF EXISTS viral_video_analyses CASCADE;
DROP TABLE IF EXISTS viral_factors CASCADE;
DROP TABLE IF EXISTS video_viral_factors CASCADE;
DROP TABLE IF EXISTS emotions CASCADE;
DROP TABLE IF EXISTS video_emotions CASCADE;
DROP TABLE IF EXISTS hook_patterns CASCADE;
DROP TABLE IF EXISTS video_hook_patterns CASCADE;
DROP MATERIALIZED VIEW IF EXISTS top_content_formulas CASCADE;
DROP MATERIALIZED VIEW IF EXISTS emotion_combinations CASCADE;
DROP MATERIALIZED VIEW IF EXISTS hook_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS author_strategies CASCADE;
DROP MATERIALIZED VIEW IF EXISTS content_trends CASCADE;
DROP FUNCTION IF EXISTS get_winning_formula CASCADE;
DROP FUNCTION IF EXISTS get_similar_videos CASCADE;

-- Main analysis table
CREATE TABLE viral_video_analyses (
  id SERIAL PRIMARY KEY,
  video_id TEXT UNIQUE NOT NULL,
  view_count BIGINT NOT NULL,
  like_count BIGINT NOT NULL,
  comment_count BIGINT NOT NULL,
  share_count BIGINT NOT NULL,
  engagement_rate DECIMAL(5,2) GENERATED ALWAYS AS ((like_count + comment_count + share_count)::decimal / NULLIF(view_count, 0) * 100) STORED,
  duration INTEGER NOT NULL,
  author_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  hook_type TEXT,
  primary_emotion TEXT NOT NULL,
  secondary_emotion TEXT,
  tertiary_emotion TEXT,
  viral_factor_1 TEXT NOT NULL,
  viral_factor_2 TEXT,
  viral_factor_3 TEXT,
  hook_strategy TEXT NOT NULL,
  hook_word_count INTEGER,
  hook_has_question BOOLEAN DEFAULT FALSE,
  hook_has_number BOOLEAN DEFAULT FALSE,
  hook_personal BOOLEAN DEFAULT FALSE,
  video_structure TEXT,
  pacing TEXT,
  replication_formula TEXT NOT NULL,
  target_audience TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  analysis_confidence DECIMAL(3,2) NOT NULL DEFAULT 0.8,
  raw_caption TEXT,
  raw_hook TEXT,
  raw_analysis_response JSONB
);

-- Create indexes
CREATE INDEX idx_analyses_content_type ON viral_video_analyses(content_type);
CREATE INDEX idx_analyses_view_count ON viral_video_analyses(view_count DESC);
CREATE INDEX idx_analyses_engagement_rate ON viral_video_analyses(engagement_rate DESC);
CREATE INDEX idx_analyses_primary_emotion ON viral_video_analyses(primary_emotion);
CREATE INDEX idx_analyses_author ON viral_video_analyses(author_name);
CREATE INDEX idx_analyses_hook_type ON viral_video_analyses(hook_type);
CREATE INDEX idx_analyses_analyzed_at ON viral_video_analyses(analyzed_at);
`

    // Note: We can't execute raw SQL through the Supabase client
    // The migration needs to be run through Supabase dashboard or CLI

    console.log(
      '📋 Migration SQL generated. Please run this in your Supabase SQL editor:'
    )
    console.log(
      '\nGo to: https://app.supabase.com/project/molydcrzwsoeyqkiofwe/editor'
    )
    console.log('\nThen paste and run the migration from:')
    console.log('supabase/migrations/create_viral_analysis_schema.sql')

    // Check if table exists
    const { data, error } = await supabase
      .from('viral_video_analyses')
      .select('count')
      .limit(1)

    if (error && error.code === '42P01') {
      console.log('\n❌ Table "viral_video_analyses" does not exist')
      console.log('Please run the migration in Supabase SQL editor')
      return false
    }

    if (!error) {
      console.log('\n✅ Table "viral_video_analyses" already exists!')
      return true
    }

    console.error('\n❌ Error checking table:', error)
    return false
  } catch (error) {
    console.error('❌ Error:', error)
    return false
  }
}

// Export for use in browser
if (typeof window !== 'undefined') {
  ;(window as any).applyViralSchema = applyViralSchema
}
